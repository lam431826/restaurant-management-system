package com.rms.restaurant.module.reservation.service.impl;

import com.rms.restaurant.common.utils.enums.ReservationStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.reservation.dto.CreateReservationRequest;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import com.rms.restaurant.module.reservation.dto.UpdateReservationRequest;
import com.rms.restaurant.module.reservation.mapper.ReservationMapper;
import com.rms.restaurant.module.reservation.model.Reservation;
import com.rms.restaurant.module.reservation.repository.ReservationRepository;
import com.rms.restaurant.module.reservation.service.ReservationService;
import com.rms.restaurant.module.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ReservationServiceImpl implements ReservationService {

    private final ReservationRepository reservationRepository;
    private final TableRepository tableRepository;
    private final ReservationMapper reservationMapper;

    @Override public PageResponse<ReservationResponse> list(Pageable pageable) { return null; }
    @Override public ReservationResponse getById(String id) { return null; }

    @Override
    public ReservationResponse create(CreateReservationRequest request, String createdBy) {
        validateTable(request.tableId());

        Reservation reservation = reservationMapper.toEntity(request);
        reservation.setCreatedBy(createdBy);
        reservation.setStatus(ReservationStatus.PENDING);

        return reservationMapper.toResponse(reservationRepository.save(reservation));
    }

    @Override
    public ReservationResponse update(String id, UpdateReservationRequest request) {
        Reservation reservation = findReservationById(id);
        validateUpdatableStatus(reservation);
        validateTable(request.tableId());

        applyUpdates(reservation, request);
        return reservationMapper.toResponse(reservationRepository.save(reservation));
    }

    @Override
    public void cancel(String id) {
        Reservation reservation = findReservationById(id);
        validateCancellableStatus(reservation);
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);
    }

    @Override
    public ReservationResponse checkIn(String id) {
        Reservation reservation = findReservationById(id);
        validateCheckInStatus(reservation);
        reservation.setStatus(ReservationStatus.CHECKED_IN);
        return reservationMapper.toResponse(reservationRepository.save(reservation));
    }

    @Override public void markNoShow(String id) {}

    private Reservation findReservationById(String id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new ApplicationException(ApplicationError.RESERVATION_NOT_FOUND));
    }

    private void validateUpdatableStatus(Reservation reservation) {
        if (reservation.getStatus() == ReservationStatus.CANCELLED
                || reservation.getStatus() == ReservationStatus.NO_SHOW) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }
    }

    private void validateCancellableStatus(Reservation reservation) {
        if (reservation.getStatus() == ReservationStatus.CANCELLED
                || reservation.getStatus() == ReservationStatus.NO_SHOW
                || reservation.getStatus() == ReservationStatus.CHECKED_IN) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }
    }

    private void validateCheckInStatus(Reservation reservation) {
        if (reservation.getStatus() == ReservationStatus.CANCELLED
                || reservation.getStatus() == ReservationStatus.NO_SHOW
                || reservation.getStatus() == ReservationStatus.CHECKED_IN) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }
    }

    private void validateTable(String tableId) {
        if (tableId == null || tableId.isBlank()) {
            return;
        }
        if (!tableRepository.existsById(tableId)) {
            throw new ApplicationException(ApplicationError.TABLE_NOT_FOUND);
        }
    }

    private void applyUpdates(Reservation reservation, UpdateReservationRequest request) {
        if (request.tableId() != null) {
            reservation.setTableId(request.tableId().isBlank() ? null : request.tableId());
        }
        if (request.partySize() != null) {
            reservation.setPartySize(request.partySize());
        }
        if (request.datetime() != null) {
            reservation.setDatetime(request.datetime());
        }
        if (request.note() != null) {
            reservation.setNote(request.note());
        }
        if (request.status() != null) {
            validateStatusTransition(reservation.getStatus(), request.status());
            reservation.setStatus(request.status());
        }
    }

    private void validateStatusTransition(ReservationStatus currentStatus, ReservationStatus newStatus) {
        if (currentStatus == newStatus) {
            return;
        }
        if (currentStatus == ReservationStatus.CHECKED_IN
                || newStatus == ReservationStatus.PENDING) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }
    }
}
