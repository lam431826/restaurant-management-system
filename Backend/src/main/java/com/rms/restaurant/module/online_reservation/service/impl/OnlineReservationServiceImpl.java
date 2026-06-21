package com.rms.restaurant.module.online_reservation.service.impl;

import com.rms.restaurant.common.utils.enums.NotificationType;
import com.rms.restaurant.common.utils.enums.ReservationStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.notification.dto.ReservationNotificationRequest;
import com.rms.restaurant.module.notification.service.NotificationService;
import com.rms.restaurant.module.online_reservation.dto.AvailabilityRequest;
import com.rms.restaurant.module.online_reservation.dto.AvailabilityResponse;
import com.rms.restaurant.module.online_reservation.dto.OnlineReservationRequest;
import com.rms.restaurant.module.online_reservation.service.OnlineReservationService;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import com.rms.restaurant.module.reservation.mapper.ReservationMapper;
import com.rms.restaurant.module.reservation.model.Reservation;
import com.rms.restaurant.module.reservation.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class OnlineReservationServiceImpl implements OnlineReservationService {

    private final ReservationRepository reservationRepository;
    private final ReservationMapper reservationMapper;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public AvailabilityResponse checkAvailability(AvailabilityRequest request) {
        // TODO: query restaurant_tables + reservations để tính slot trống
        // Deferred — implement khi TM (Table Management) hoàn thành
        return new AvailabilityResponse(List.of(), List.of());
    }

    @Override
    public ReservationResponse create(OnlineReservationRequest request) {
        // Validate thời gian: phải ≥ 30 phút từ bây giờ (BR-03)
        if (request.datetime().isBefore(LocalDateTime.now().plusMinutes(30))) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }

        Reservation reservation = Reservation.builder()
                .guestName(request.guestName())
                .phone(request.phone())
                .guestEmail(request.email())       // lưu email để gửi notification
                .partySize(request.partySize())
                .datetime(request.datetime())
                .note(request.note())
                .status(ReservationStatus.CONFIRMED) // online booking = auto CONFIRMED
                .createdBy("ONLINE")
                .build();

        Reservation saved = reservationRepository.save(reservation);

        // NM-01: gửi confirmation qua email + SMS (async, non-blocking)
        try {
            notificationService.sendReservationNotification(
                    new ReservationNotificationRequest(saved.getId(), NotificationType.CONFIRMATION));
        } catch (Exception e) {
            log.warn("NM-01 trigger failed after online reservation create {}: {}", saved.getId(), e.getMessage());
        }

        return reservationMapper.toResponse(saved);
    }

    @Override
    public void cancel(String id, String phone) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ApplicationException(ApplicationError.RESERVATION_NOT_FOUND));

        // Xác thực: phone phải khớp với reservation
        if (!reservation.getPhone().equals(phone)) {
            throw new ApplicationException(ApplicationError.RESERVATION_NOT_FOUND);
        }

        if (reservation.getStatus() != ReservationStatus.CONFIRMED
                && reservation.getStatus() != ReservationStatus.PENDING) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        // NM-01: gửi thông báo hủy (async)
        try {
            notificationService.sendReservationNotification(
                    new ReservationNotificationRequest(id, NotificationType.CANCELLATION));
        } catch (Exception e) {
            log.warn("NM-01 trigger failed after online cancel {}: {}", id, e.getMessage());
        }
    }
}
