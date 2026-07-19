package com.rms.restaurant.module.notification.service;

import com.rms.restaurant.common.realtime.RealtimeEventPublisher;
import com.rms.restaurant.common.utils.enums.NotificationChannel;
import com.rms.restaurant.common.utils.mail.GmailService;
import com.rms.restaurant.module.notification.mapper.NotificationMapper;
import com.rms.restaurant.module.notification.model.NotificationLog;
import com.rms.restaurant.module.notification.repository.NotificationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Tách riêng để @Async + @Transactional(REQUIRES_NEW) hoạt động đúng.
 * Spring AOP chỉ apply annotation khi gọi qua proxy (bean khác).
 * Nếu NotificationServiceImpl tự gọi sendAsync() thì @Async bị bỏ qua.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationDispatcher {

    private final GmailService gmailService;
    private final NotificationLogRepository notificationLogRepository;
    private final NotificationMapper notificationMapper;
    private final RealtimeEventPublisher realtimeEventPublisher;

    @Async("notificationExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void dispatch(String recipient, String template, Map<String, Object> vars,
                         String referenceId, String referenceType) {
        NotificationLog notifLog = NotificationLog.builder()
                .type(referenceType != null ? referenceType : "UNKNOWN")
                .channel(NotificationChannel.EMAIL)
                .recipient(recipient)
                .template(template)
                .status("PENDING")
                .referenceId(referenceId)
                .referenceType(referenceType)
                .build();
        notificationLogRepository.save(notifLog);

        try {
            dispatchEmail(recipient, template, vars);
            notifLog.setStatus("SENT");
        } catch (Exception e) {
            notifLog.setStatus("FAILED");
            notifLog.setErrorMessage(e.getMessage());
            log.warn("Email FAILED [recipient={}, template={}]: {}", recipient, template, e.getMessage());
        } finally {
            notificationLogRepository.save(notifLog);
            realtimeEventPublisher.publishNotificationEvent(notificationMapper.toResponse(notifLog));
        }
    }

    private void dispatchEmail(String recipient, String template, Map<String, Object> vars) {
        switch (template) {
            case "RESERVATION_PENDING" -> gmailService.sendReservationPendingEmail(
                    recipient,
                    (String) vars.get("guestName"),
                    (LocalDateTime) vars.get("datetime"),
                    (int) vars.get("partySize"),
                    (String) vars.get("reservationId")
            );
            case "RESERVATION_CONFIRMATION" -> gmailService.sendReservationConfirmationEmail(
                    recipient,
                    (String) vars.get("guestName"),
                    (LocalDateTime) vars.get("datetime"),
                    (int) vars.get("partySize"),
                    (String) vars.get("reservationId")
            );
            case "RESERVATION_REMINDER" -> gmailService.sendReservationReminderEmail(
                    recipient,
                    (String) vars.get("guestName"),
                    (LocalDateTime) vars.get("datetime")
            );
            case "RESERVATION_CANCELLATION" -> gmailService.sendReservationCancellationEmail(
                    recipient,
                    (String) vars.get("guestName"),
                    (LocalDateTime) vars.get("datetime")
            );
            case "RESERVATION_NO_SHOW" -> gmailService.sendNoShowEmail(
                    recipient,
                    (String) vars.get("guestName"),
                    (LocalDateTime) vars.get("datetime")
            );
            case "RESERVATION_TABLE_UPDATE" -> gmailService.sendTableUpdateEmail(
                    recipient,
                    (String) vars.get("guestName"),
                    (String) vars.getOrDefault("tableName", ""),
                    (LocalDateTime) vars.get("datetime"),
                    (int) vars.get("partySize"),
                    (String) vars.get("reservationId")
            );
            case "PAYMENT_CONFIRMATION" -> gmailService.sendPaymentConfirmationEmail(
                    recipient,
                    (String) vars.get("guestName"),
                    (BigDecimal) vars.get("totalAmount"),
                    (String) vars.get("invoiceId")
            );
            case "MANUAL" -> gmailService.sendManualEmail(recipient, (String) vars.get("message"));
            default -> throw new IllegalArgumentException("Unknown email template: " + template);
        }
    }
}
