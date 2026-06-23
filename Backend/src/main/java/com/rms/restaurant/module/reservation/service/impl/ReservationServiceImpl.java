package com.rms.restaurant.module.reservation.service.impl;

import com.rms.restaurant.common.utils.enums.NotificationType;
import com.rms.restaurant.common.utils.enums.ReservationStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.notification.dto.ReservationNotificationRequest;
import com.rms.restaurant.module.notification.service.NotificationService;
import com.rms.restaurant.module.reservation.dto.CreateReservationRequest;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import com.rms.restaurant.module.reservation.dto.UpdateReservationRequest;
import com.rms.restaurant.module.reservation.mapper.ReservationMapper;
import com.rms.restaurant.module.reservation.model.Reservation;
import com.rms.restaurant.module.reservation.repository.ReservationRepository;
import com.rms.restaurant.module.reservation.service.ReservationService;
import com.rms.restaurant.module.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumSet;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ReservationServiceImpl implements ReservationService {

    private static final EnumSet<ReservationStatus> TERMINAL_STATUSES =
            EnumSet.of(ReservationStatus.CHECKED_IN, ReservationStatus.NO_SHOW, ReservationStatus.CANCELLED);

    private final ReservationRepository reservationRepository;
    private final ReservationMapper reservationMapper;
    private final TableRepository tableRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ReservationResponse> list(Pageable pageable) {
        return PageResponse.of(
                reservationRepository.findAll(pageable).map(reservationMapper::toResponse)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationResponse getById(String id) {
        return reservationMapper.toResponse(findOrThrow(id));
    }

    // ── Staff tạo đặt bàn qua điện thoại → auto CONFIRMED ────────────────────

    @Override
    public ReservationResponse create(CreateReservationRequest request) {
        if (request.tableId() != null) {
            validateTableExists(request.tableId());
            checkTableAvailability(request.tableId(), request.datetime(), null);
        }
        Reservation reservation = Reservation.builder()
                .guestName(request.guestName())
                .phone(request.phone())
                .partySize(request.partySize())
                .datetime(request.datetime())
                .tableId(request.tableId())
                .note(request.note())
                .guestEmail(request.guestEmail())
                .status(ReservationStatus.CONFIRMED)
                .build();
        Reservation saved = reservationRepository.save(reservation);

        if (saved.getGuestEmail() != null && !saved.getGuestEmail().isBlank()) {
            try {
                notificationService.sendReservationNotification(
                        new ReservationNotificationRequest(saved.getId(), NotificationType.CONFIRMATION));
            } catch (Exception e) {
                log.warn("NM-01 CONFIRMATION trigger (create) failed for {}: {}", saved.getId(), e.getMessage());
            }
        }

        return reservationMapper.toResponse(saved);
    }

    // ── Staff confirm: PENDING → CONFIRMED ───────────────────────────────────
    // Nhân viên gọi điện xác nhận với khách ngoài đời thực rồi mới bấm confirm

    @Override
    public ReservationResponse confirm(String id) {
        Reservation reservation = findOrThrow(id);
        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }
        reservation.setStatus(ReservationStatus.CONFIRMED);
        Reservation saved = reservationRepository.save(reservation);

        // NM-01: gửi email "đã được xác nhận" cho khách (async)
        try {
            notificationService.sendReservationNotification(
                    new ReservationNotificationRequest(saved.getId(), NotificationType.CONFIRMATION));
        } catch (Exception e) {
            log.warn("NM-01 CONFIRMATION trigger failed for reservation {}: {}", saved.getId(), e.getMessage());
        }

        return reservationMapper.toResponse(saved);
    }

    @Override
    public ReservationResponse update(String id, UpdateReservationRequest request) {
        Reservation reservation = findOrThrow(id);

        if (TERMINAL_STATUSES.contains(reservation.getStatus())) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }

        if (request.tableId() != null) {
            validateTableExists(request.tableId());
            checkTableAvailability(request.tableId(),
                    request.datetime() != null ? request.datetime() : reservation.getDatetime(),
                    id);
            reservation.setTableId(request.tableId());
        }
        if (request.partySize() != null) reservation.setPartySize(request.partySize());
        if (request.datetime() != null) reservation.setDatetime(request.datetime());
        if (request.note() != null) reservation.setNote(request.note());
        if (request.status() != null) {
            validateTransition(reservation.getStatus(), request.status());
            reservation.setStatus(request.status());
        }

        return reservationMapper.toResponse(reservationRepository.save(reservation));
    }

    // ── Staff cancel (PENDING hoặc CONFIRMED → CANCELLED) ────────────────────

    @Override
    public void cancel(String id) {
        Reservation reservation = findOrThrow(id);
        if (!EnumSet.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED)
                .contains(reservation.getStatus())) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        // NM-01: gửi thông báo huỷ cho khách (async)
        try {
            notificationService.sendReservationNotification(
                    new ReservationNotificationRequest(id, NotificationType.CANCELLATION));
        } catch (Exception e) {
            log.warn("NM-01 CANCELLATION trigger failed for reservation {}: {}", id, e.getMessage());
        }
    }

    @Override
    public ReservationResponse checkIn(String id) {
        Reservation reservation = findOrThrow(id);
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }
        reservation.setStatus(ReservationStatus.CHECKED_IN);
        return reservationMapper.toResponse(reservationRepository.save(reservation));
    }

    @Override
    public void markNoShow(String id) {
        Reservation reservation = findOrThrow(id);
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }
        reservation.setStatus(ReservationStatus.NO_SHOW);
        reservationRepository.save(reservation);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Reservation findOrThrow(String id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.RESERVATION_NOT_FOUND));
    }

    private void validateTableExists(String tableId) {
        if (!tableRepository.existsById(tableId)) {
            throw new ResourceNotFoundException(ApplicationError.TABLE_NOT_FOUND);
        }
    }

    private void checkTableAvailability(String tableId, LocalDateTime datetime, String excludeId) {
        boolean conflict = reservationRepository.findByTableIdAndStatus(tableId, ReservationStatus.PENDING)
                .stream()
                .anyMatch(r -> !r.getId().equals(excludeId) && r.getDatetime().equals(datetime));
        if (!conflict) {
            conflict = reservationRepository.findByTableIdAndStatus(tableId, ReservationStatus.CONFIRMED)
                    .stream()
                    .anyMatch(r -> !r.getId().equals(excludeId) && r.getDatetime().equals(datetime));
        }
        if (conflict) {
            throw new ApplicationException(ApplicationError.TABLE_NOT_AVAILABLE);
        }
    }

    private void validateTransition(ReservationStatus current, ReservationStatus next) {
        boolean valid = switch (current) {
            case PENDING -> next == ReservationStatus.CONFIRMED || next == ReservationStatus.CANCELLED;
            case CONFIRMED -> next == ReservationStatus.CHECKED_IN
                    || next == ReservationStatus.NO_SHOW
                    || next == ReservationStatus.CANCELLED;
            default -> false;
        };
        if (!valid) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }
    }
}
