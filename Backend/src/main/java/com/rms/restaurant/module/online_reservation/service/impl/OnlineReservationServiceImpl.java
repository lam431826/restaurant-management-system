package com.rms.restaurant.module.online_reservation.service.impl;

import com.rms.restaurant.common.utils.enums.NotificationType;
import com.rms.restaurant.common.utils.enums.ReservationStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.common.utils.exception.UnauthorizedException;
import com.rms.restaurant.common.utils.mail.GmailService;
import com.rms.restaurant.module.notification.dto.ReservationNotificationRequest;
import com.rms.restaurant.module.notification.service.NotificationService;
import com.rms.restaurant.module.online_reservation.dto.AvailabilityRequest;
import com.rms.restaurant.module.online_reservation.dto.AvailabilityResponse;
import com.rms.restaurant.module.online_reservation.dto.OnlineCancelConfirmInput;
import com.rms.restaurant.module.online_reservation.dto.OnlineCancelRequestInput;
import com.rms.restaurant.module.online_reservation.dto.OnlineCancelRequestResponse;
import com.rms.restaurant.module.online_reservation.dto.OnlineReservationRequest;
import com.rms.restaurant.module.online_reservation.service.OnlineReservationService;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import com.rms.restaurant.module.reservation.mapper.ReservationMapper;
import com.rms.restaurant.module.reservation.model.Reservation;
import com.rms.restaurant.module.reservation.repository.ReservationRepository;
import com.rms.restaurant.module.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class OnlineReservationServiceImpl implements OnlineReservationService {

    private static final int WINDOW_MINUTES = 180;

    private static final EnumSet<ReservationStatus> CANCELLABLE =
            EnumSet.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED);

    private static final List<ReservationStatus> ACTIVE_STATUSES =
            List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN);

    private final ReservationRepository reservationRepository;
    private final TableRepository tableRepository;
    private final ReservationMapper reservationMapper;
    private final NotificationService notificationService;
    private final GmailService gmailService;
    private final SecureRandom secureRandom = new SecureRandom();

    // ── ORM-01: Kiểm tra slot bàn trống ──────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public AvailabilityResponse checkAvailability(AvailabilityRequest request) {
        // TODO: tích hợp với TableService sau khi TM hoàn thiện
        return new AvailabilityResponse(java.util.List.of(), java.util.List.of());
    }

    // ── ORM-02: Khách tạo đặt bàn ────────────────────────────────────────────

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public ReservationResponse create(OnlineReservationRequest request) {
        if (request.datetime().isBefore(LocalDateTime.now().plusMinutes(30))) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }

        // Tier-based overbooking guard.
        // Each party size maps to a tier: only tables within that tier's capacity range are eligible.
        // E.g. a party of 2 can only occupy a 1–2 seat table; a capacity-8 table is reserved for 7–8 guests.
        int[] tier = getTierRange(request.partySize());
        List<String> tierTableIds = tableRepository.findIdsByCapacityBetween(tier[0], tier[1]);
        if (tierTableIds.isEmpty()) {
            throw new ApplicationException(ApplicationError.TABLE_FULLY_BOOKED);
        }
        LocalDateTime windowStart = request.datetime().minusMinutes(WINDOW_MINUTES);
        LocalDateTime windowEnd   = request.datetime().plusMinutes(WINDOW_MINUTES);
        long bookedInTier = reservationRepository.countActiveInWindowForTables(
                ACTIVE_STATUSES, windowStart, windowEnd, tierTableIds);
        if (bookedInTier >= tierTableIds.size()) {
            throw new ApplicationException(ApplicationError.TABLE_FULLY_BOOKED);
        }

        Reservation reservation = Reservation.builder()
                .guestName(request.guestName())
                .phone(request.phone())
                .guestEmail(request.email())
                .partySize(request.partySize())
                .datetime(request.datetime())
                .note(request.note())
                .status(ReservationStatus.PENDING)   // Chờ nhân viên xác nhận
                .createdBy(null)
                .build();

        Reservation saved = reservationRepository.save(reservation);

        // NM-01: gửi email "đang chờ xác nhận" (async, non-blocking)
        try {
            notificationService.sendReservationNotification(
                    new ReservationNotificationRequest(saved.getId(), NotificationType.PENDING));
        } catch (Exception e) {
            log.warn("NM-01 PENDING trigger failed for reservation {}: {}", saved.getId(), e.getMessage());
        }

        return reservationMapper.toResponse(saved);
    }

    // ── ORM-03 Bước 1: Yêu cầu huỷ — verify SĐT, gửi OTP về email ───────────

    @Override
    public OnlineCancelRequestResponse requestCancellation(String reservationId,
                                                            OnlineCancelRequestInput input) {
        Reservation reservation = findOrThrow(reservationId);

        // Xác thực số điện thoại
        if (!reservation.getPhone().equals(input.phone())) {
            throw new UnauthorizedException(ApplicationError.RESERVATION_PHONE_MISMATCH);
        }

        // Chỉ PENDING hoặc CONFIRMED mới có thể huỷ
        if (!CANCELLABLE.contains(reservation.getStatus())) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }

        // Phải có email để gửi OTP
        String email = reservation.getGuestEmail();
        if (email == null || email.isBlank()) {
            throw new ApplicationException(ApplicationError.RESERVATION_NO_EMAIL);
        }

        // Tạo OTP và cancel token
        String otp = String.format("%06d", secureRandom.nextInt(1_000_000));
        String cancelToken = UUID.randomUUID().toString();
        LocalDateTime expires = LocalDateTime.now().plusMinutes(10);

        reservation.setCancelOtp(otp);
        reservation.setCancelToken(cancelToken);
        reservation.setCancelOtpExpires(expires);
        reservationRepository.save(reservation);

        // Gửi OTP đồng bộ — khách đang chờ; nếu gửi thất bại → transaction rollback, OTP không committed
        try {
            gmailService.sendCancelOtpEmail(email, reservation.getGuestName(), otp);
        } catch (Exception e) {
            log.warn("ORM-03 cancel OTP email failed for reservation {}: {}", reservationId, e.getMessage());
            throw new ApplicationException(ApplicationError.INTERNAL_ERROR);
        }

        return new OnlineCancelRequestResponse(maskEmail(email), expires);
    }

    // ── ORM-03 Bước 2: Xác nhận OTP → huỷ đặt bàn ───────────────────────────

    @Override
    public void confirmCancellation(String reservationId, OnlineCancelConfirmInput input) {
        Reservation reservation = findOrThrow(reservationId);

        // Validate cancel token
        if (reservation.getCancelToken() == null
                || !reservation.getCancelToken().equals(input.cancelToken())) {
            throw new UnauthorizedException(ApplicationError.CANCEL_TOKEN_INVALID);
        }

        // Validate hết hạn
        if (reservation.getCancelOtpExpires() == null
                || LocalDateTime.now().isAfter(reservation.getCancelOtpExpires())) {
            throw new ApplicationException(ApplicationError.OTP_EXPIRED);
        }

        // Validate OTP
        if (!reservation.getCancelOtp().equals(input.otp())) {
            throw new ApplicationException(ApplicationError.INVALID_OTP);
        }

        // Xoá cancel fields, cập nhật status
        reservation.setCancelOtp(null);
        reservation.setCancelToken(null);
        reservation.setCancelOtpExpires(null);
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        // NM-01: gửi email xác nhận đã huỷ (async)
        try {
            notificationService.sendReservationNotification(
                    new ReservationNotificationRequest(reservationId, NotificationType.CANCELLATION));
        } catch (Exception e) {
            log.warn("NM-01 CANCELLATION trigger failed for reservation {}: {}", reservationId, e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Reservation findOrThrow(String id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.RESERVATION_NOT_FOUND));
    }

    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return email;
        return email.charAt(0) + "***" + email.substring(at);
    }

    /**
     * Maps a party size to the capacity range [min, max] of eligible tables.
     * Tables with capacity outside this range are not considered for the booking,
     * preserving larger tables for larger groups (revenue optimisation).
     * <pre>
     *  1–2   → [1, 2]
     *  3–4   → [3, 4]
     *  5–6   → [5, 6]
     *  7–8   → [7, 8]
     *  9–10  → [9, 10]
     * 11–12  → [11, 12]
     * 13–20  → [13, 20]
     * </pre>
     */
    private static int[] getTierRange(int partySize) {
        if (partySize <= 2)  return new int[]{1,  2};
        if (partySize <= 4)  return new int[]{3,  4};
        if (partySize <= 6)  return new int[]{5,  6};
        if (partySize <= 8)  return new int[]{7,  8};
        if (partySize <= 10) return new int[]{9,  10};
        if (partySize <= 12) return new int[]{11, 12};
        return                      new int[]{13, 20};
    }
}
