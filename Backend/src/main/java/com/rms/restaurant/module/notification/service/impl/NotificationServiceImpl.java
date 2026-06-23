package com.rms.restaurant.module.notification.service.impl;

import com.rms.restaurant.common.utils.enums.NotificationType;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.notification.dto.ManualNotificationRequest;
import com.rms.restaurant.module.notification.dto.NotificationLogResponse;
import com.rms.restaurant.module.notification.dto.PaymentNotificationRequest;
import com.rms.restaurant.module.notification.dto.ReservationNotificationRequest;
import com.rms.restaurant.module.notification.mapper.NotificationMapper;
import com.rms.restaurant.module.notification.repository.NotificationLogRepository;
import com.rms.restaurant.module.notification.service.NotificationDispatcher;
import com.rms.restaurant.module.notification.service.NotificationService;
import com.rms.restaurant.module.reservation.model.Reservation;
import com.rms.restaurant.module.reservation.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationDispatcher dispatcher;
    private final ReservationRepository reservationRepository;
    private final NotificationLogRepository notificationLogRepository;
    private final NotificationMapper notificationMapper;

    // ── NM-01: Reservation notifications ─────────────────────────────────────

    @Override
    public void sendReservationNotification(ReservationNotificationRequest request) {
        Reservation reservation = reservationRepository.findById(request.reservationId())
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.RESERVATION_NOT_FOUND));

        String email = reservation.getGuestEmail();
        if (email == null || email.isBlank()) {
            log.info("NM-01 skipped for reservation {} — no guest email on record", reservation.getId());
            return;
        }

        Map<String, Object> vars = Map.of(
                "guestName",     reservation.getGuestName(),
                "datetime",      reservation.getDatetime(),
                "partySize",     reservation.getPartySize(),
                "reservationId", reservation.getId()
        );

        // Gọi qua dispatcher bean → @Async + REQUIRES_NEW hoạt động đúng
        dispatcher.dispatch(email, templateFor(request.type()), vars,
                reservation.getId(), "RESERVATION");
    }

    // ── NM-01 Cron: reminder 60 phút trước giờ đặt ───────────────────────────
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void sendScheduledReminders() {
        LocalDateTime from = LocalDateTime.now().plusMinutes(55);
        LocalDateTime to   = LocalDateTime.now().plusMinutes(65);

        List<Reservation> upcoming = reservationRepository
                .findConfirmedBetweenAndReminderNotSent(from, to);

        if (!upcoming.isEmpty()) {
            log.info("Cron reminder: {} reservation(s) to notify", upcoming.size());
        }

        for (Reservation r : upcoming) {
            sendReservationNotification(new ReservationNotificationRequest(
                    r.getId(), NotificationType.REMINDER));
            r.setReminderSent(true);
            reservationRepository.save(r);
        }
    }

    // ── NM-02: Payment notification ───────────────────────────────────────────

    @Override
    public void sendPaymentNotification(PaymentNotificationRequest request) {
        log.info("NM-02 payment notification queued for invoice={} — deferred until PM-03",
                request.invoiceId());
    }

    // ── NM-03: Log query ──────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationLogResponse> getLogs(String type, String status,
                                                          String referenceId,
                                                          LocalDate from, LocalDate to,
                                                          Pageable pageable) {
        LocalDateTime fromDT = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDT   = to   != null ? to.plusDays(1).atStartOfDay() : null;

        return PageResponse.of(
                notificationLogRepository
                        .findWithFilters(type, status, referenceId, fromDT, toDT, pageable)
                        .map(notificationMapper::toResponse)
        );
    }

    // ── NM-04: Manual email ───────────────────────────────────────────────────

    @Override
    public void sendManual(ManualNotificationRequest request) {
        dispatcher.dispatch(request.recipient(), "MANUAL",
                Map.of("message", request.message()), null, "MANUAL");
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private String templateFor(NotificationType type) {
        return switch (type) {
            case PENDING      -> "RESERVATION_PENDING";
            case CONFIRMATION -> "RESERVATION_CONFIRMATION";
            case REMINDER     -> "RESERVATION_REMINDER";
            case CANCELLATION -> "RESERVATION_CANCELLATION";
            case PAYMENT      -> "PAYMENT_CONFIRMATION";
        };
    }
}
