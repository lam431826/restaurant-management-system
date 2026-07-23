package com.rms.restaurant.module.online_reservation.service.impl;

import com.rms.restaurant.common.realtime.RealtimeEventPublisher;
import com.rms.restaurant.common.utils.enums.NotificationType;
import com.rms.restaurant.common.utils.enums.ReservationStatus;
import com.rms.restaurant.common.utils.enums.TableStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.notification.dto.ReservationNotificationRequest;
import com.rms.restaurant.module.notification.service.NotificationService;
import com.rms.restaurant.module.online_reservation.dto.OnlineReservationRequest;
import com.rms.restaurant.module.online_reservation.service.OnlineReservationService;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import com.rms.restaurant.module.reservation.mapper.ReservationMapper;
import com.rms.restaurant.module.reservation.model.Reservation;
import com.rms.restaurant.module.reservation.repository.ReservationRepository;
import com.rms.restaurant.module.table.repository.TableRepository;
import com.rms.restaurant.module.user.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class OnlineReservationServiceImpl implements OnlineReservationService {

    // BR: mirrors WALK_IN_COOLDOWN_MINUTES in ReservationServiceImpl — a reservation's dining
    // (90 min) + cleanup (30 min) window occupies its table for 120 minutes, so two reservations
    // in the same capacity tier conflict whenever their requested times fall within 120 minutes
    // of each other. Symmetric (+/-) because either one could be the earlier seating.
    private static final int WINDOW_MINUTES = 120;

    // Restaurant opening hours (see PublicWebsite ContactSection.jsx "Opening Hours" card) — applies every day of the week.
    private static final LocalTime OPENING_TIME = LocalTime.of(16, 0);
    private static final LocalTime CLOSING_TIME = LocalTime.of(22, 30);

    // BR: a booking must leave the guest a full dining window before closing — after CLOSING_TIME the
    // restaurant is only doing wrap-up/cleanup, not seating guests. So the latest a reservation can start
    // is CLOSING_TIME minus the max dining duration.
    private static final int MAX_DINING_MINUTES = 90;
    private static final LocalTime LAST_RESERVATION_TIME = CLOSING_TIME.minusMinutes(MAX_DINING_MINUTES);

    private static final List<ReservationStatus> ACTIVE_STATUSES =
            List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN);

    private final ReservationRepository reservationRepository;
    private final TableRepository tableRepository;
    private final ReservationMapper reservationMapper;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final RealtimeEventPublisher realtimeEventPublisher;

    // ── ORM-02: Khách tạo đặt bàn ────────────────────────────────────────────

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public ReservationResponse create(OnlineReservationRequest request) {
        if (request.datetime().isBefore(LocalDateTime.now().plusMinutes(30))) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }
        LocalTime requestedTime = request.datetime().toLocalTime();
        if (requestedTime.isBefore(OPENING_TIME) || requestedTime.isAfter(LAST_RESERVATION_TIME)) {
            throw new ApplicationException(ApplicationError.RESERVATION_OUTSIDE_HOURS);
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
        // BE-RES-03 fix: online reservations are created without a tableId (staff assign
        // tables later), so counting by already-assigned tableId (countActiveInWindowForTables)
        // never counted them — the guard was effectively inert. Count demand by party-size
        // tier instead, regardless of whether a table has been assigned yet.
        long bookedInTier = reservationRepository.countActiveInWindowByPartySizeRange(
                ACTIVE_STATUSES, windowStart, windowEnd, tier[0], tier[1]);
        long adHocOccupiedInTier = countAdHocOccupiedInTier(tierTableIds, request.datetime());
        if (bookedInTier + adHocOccupiedInTier >= tierTableIds.size()) {
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

        audit("RESERVATION_CREATE", saved.getId(),
                "{\"channel\":\"ONLINE\",\"guestName\":\"" + esc(saved.getGuestName()) + "\"}");

        ReservationResponse response = reservationMapper.toResponse(saved);
        realtimeEventPublisher.publishReservationEvent("CREATED", response);
        return response;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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

    /**
     * Walk-ins seated without a reservation row are invisible to bookedInTier, so a table that's
     * physically OCCUPIED/BILLING/CLEANING right now can look "free" to the tier count even though
     * no online guest could actually be seated there. Only meaningful for near-term requests — a
     * table's live status says nothing about availability days out — so this only applies when the
     * requested slot starts within MAX_DINING_MINUTES of now. Tables occupied because of a
     * CHECKED_IN reservation are excluded — that reservation is already counted in bookedInTier.
     */
    private long countAdHocOccupiedInTier(List<String> tierTableIds, LocalDateTime requestedDatetime) {
        if (requestedDatetime.isAfter(LocalDateTime.now().plusMinutes(MAX_DINING_MINUTES))) {
            return 0;
        }
        List<String> physicallyOccupied = tableRepository.findIdsByIdInAndStatusIn(
                tierTableIds, List.of(TableStatus.OCCUPIED, TableStatus.BILLING, TableStatus.CLEANING));
        if (physicallyOccupied.isEmpty()) {
            return 0;
        }
        List<String> checkedInTableIds = reservationRepository.findTableIdsByTableIdInAndStatus(
                physicallyOccupied, ReservationStatus.CHECKED_IN);
        return physicallyOccupied.stream().filter(id -> !checkedInTableIds.contains(id)).count();
    }

    private void audit(String action, String id, String detail) {
        try { auditService.log(action, "Reservation", id, detail); }
        catch (Exception e) { log.warn("Audit log failed: {}", e.getMessage()); }
    }

    private static String esc(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
