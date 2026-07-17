package com.rms.restaurant.module.reservation.service.impl;

import com.rms.restaurant.common.utils.enums.NotificationType;
import com.rms.restaurant.common.utils.enums.ReservationStatus;
import com.rms.restaurant.common.utils.enums.TableStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.common.realtime.RealtimeEventPublisher;
import com.rms.restaurant.module.notification.dto.ReservationNotificationRequest;
import com.rms.restaurant.module.notification.service.NotificationService;
import com.rms.restaurant.module.reservation.dto.CreateReservationRequest;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import com.rms.restaurant.module.reservation.dto.UpdateReservationRequest;
import com.rms.restaurant.module.reservation.model.Reservation;
import com.rms.restaurant.module.reservation.repository.ReservationRepository;
import com.rms.restaurant.module.reservation.service.ReservationService;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.table.repository.TableRepository;
import com.rms.restaurant.module.user.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ReservationServiceImpl implements ReservationService {

    // Each booking occupies [T-60min, T+120min) on a table (1h setup + 1.5h dining + 0.5h cleanup).
    // Two bookings on the same table conflict when |T1-T2| < 180 min.
    private static final int WINDOW_MINUTES = 180;

    private static final List<ReservationStatus> ACTIVE_STATUSES =
            List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN);

    private static final EnumSet<ReservationStatus> TERMINAL_STATUSES =
            EnumSet.of(ReservationStatus.CHECKED_IN, ReservationStatus.NO_SHOW, ReservationStatus.CANCELLED);

    private final ReservationRepository reservationRepository;
    private final TableRepository tableRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final RealtimeEventPublisher realtimeEventPublisher;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ReservationResponse> list(Pageable pageable) {
        var page = reservationRepository.findAll(pageable);

        Set<String> tableIds = page.getContent().stream()
                .map(Reservation::getTableId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, RestaurantTable> tableMap = tableIds.isEmpty() ? Collections.emptyMap() :
                tableRepository.findAllById(tableIds).stream()
                        .collect(Collectors.toMap(RestaurantTable::getId, t -> t));

        return PageResponse.of(page.map(r -> toResponse(r, tableMap)));
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationResponse getById(String id) {
        return enrich(findOrThrow(id));
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public ReservationResponse create(CreateReservationRequest request) {
        if (request.tableId() != null) {
            validateTableExists(request.tableId());
            validateTableCapacity(request.tableId(), request.partySize());
            checkTableAvailability(request.tableId(), request.datetime(), "");
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

        if (saved.getTableId() != null) {
            setTableStatus(saved.getTableId(), TableStatus.RESERVED, TableStatus.AVAILABLE);
        }

        if (saved.getGuestEmail() != null && !saved.getGuestEmail().isBlank()) {
            try {
                notificationService.sendReservationNotification(
                        new ReservationNotificationRequest(saved.getId(), NotificationType.CONFIRMATION));
            } catch (Exception e) {
                log.warn("NM-01 CONFIRMATION trigger (create) failed for {}: {}", saved.getId(), e.getMessage());
            }
        }

        audit("RESERVATION_CREATE", saved.getId(),
                "{\"guestName\":\"" + esc(saved.getGuestName()) + "\",\"tableId\":\"" + esc(saved.getTableId()) + "\"}");
        return enrich(saved);
    }

    @Override
    public ReservationResponse confirm(String id) {
        Reservation reservation = findOrThrow(id);
        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }
        reservation.setStatus(ReservationStatus.CONFIRMED);
        Reservation saved = reservationRepository.save(reservation);

        if (saved.getTableId() != null) {
            setTableStatus(saved.getTableId(), TableStatus.RESERVED, TableStatus.AVAILABLE);
        }

        try {
            notificationService.sendReservationNotification(
                    new ReservationNotificationRequest(saved.getId(), NotificationType.CONFIRMATION));
        } catch (Exception e) {
            log.warn("NM-01 CONFIRMATION trigger failed for reservation {}: {}", saved.getId(), e.getMessage());
        }

        audit("RESERVATION_CONFIRM", saved.getId(),
                "{\"from\":\"PENDING\",\"to\":\"CONFIRMED\",\"guestName\":\"" + esc(saved.getGuestName()) + "\"}");
        return enrich(saved);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public ReservationResponse update(String id, UpdateReservationRequest request) {
        Reservation reservation = findOrThrow(id);

        if (TERMINAL_STATUSES.contains(reservation.getStatus())) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }

        String oldTableId = reservation.getTableId();

        if (request.tableId() != null) {
            validateTableExists(request.tableId());
            int effectivePartySize = request.partySize() != null ? request.partySize() : reservation.getPartySize();
            validateTableCapacity(request.tableId(), effectivePartySize);
            checkTableAvailability(request.tableId(),
                    request.datetime() != null ? request.datetime() : reservation.getDatetime(),
                    id);
            reservation.setTableId(request.tableId());
        }

        // Edit guest info
        if (request.guestName() != null && !request.guestName().isBlank())
            reservation.setGuestName(request.guestName());
        if (request.phone() != null && !request.phone().isBlank())
            reservation.setPhone(request.phone());
        if (request.guestEmail() != null)
            reservation.setGuestEmail(request.guestEmail().isBlank() ? null : request.guestEmail());
        if (request.partySize() != null) reservation.setPartySize(request.partySize());
        if (request.datetime() != null) reservation.setDatetime(request.datetime());
        if (request.note() != null) reservation.setNote(request.note());
        if (request.status() != null) {
            validateTransition(reservation.getStatus(), request.status());
            reservation.setStatus(request.status());
        }

        Reservation saved = reservationRepository.save(reservation);

        if (request.tableId() != null && !request.tableId().equals(oldTableId)) {
            if (oldTableId != null) {
                setTableStatus(oldTableId, TableStatus.AVAILABLE, null);
            }
            if (saved.getStatus() == ReservationStatus.CONFIRMED) {
                setTableStatus(saved.getTableId(), TableStatus.RESERVED, TableStatus.AVAILABLE);
            }
            if (saved.getGuestEmail() != null && !saved.getGuestEmail().isBlank()) {
                try {
                    notificationService.sendReservationNotification(
                            new ReservationNotificationRequest(saved.getId(), NotificationType.TABLE_UPDATE));
                } catch (Exception e) {
                    log.warn("NM-01 TABLE_UPDATE trigger failed for reservation {}: {}", saved.getId(), e.getMessage());
                }
            }
        }

        String auditAction;
        String auditDetail;
        if (request.status() != null) {
            auditAction = switch (request.status()) {
                case CONFIRMED -> "RESERVATION_CONFIRM";
                case CHECKED_IN -> "RESERVATION_CHECK_IN";
                case NO_SHOW -> "RESERVATION_NO_SHOW";
                case CANCELLED -> "RESERVATION_CANCEL";
                default -> "RESERVATION_UPDATE";
            };
            auditDetail = "{\"to\":\"" + request.status() + "\",\"guestName\":\"" + esc(saved.getGuestName()) + "\"}";
        } else if (request.tableId() != null) {
            auditAction = "RESERVATION_ASSIGN_TABLE";
            auditDetail = "{\"tableId\":\"" + esc(saved.getTableId()) + "\",\"guestName\":\"" + esc(saved.getGuestName()) + "\"}";
        } else {
            auditAction = "RESERVATION_UPDATE";
            auditDetail = "{\"guestName\":\"" + esc(saved.getGuestName()) + "\"}";
        }
        audit(auditAction, saved.getId(), auditDetail);
        return enrich(saved);
    }

    @Override
    public void cancel(String id) {
        Reservation reservation = findOrThrow(id);
        if (!EnumSet.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED)
                .contains(reservation.getStatus())) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }

        if (reservation.getTableId() != null) {
            setTableStatus(reservation.getTableId(), TableStatus.AVAILABLE, TableStatus.RESERVED);
        }

        ReservationStatus prevStatus = reservation.getStatus();
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        try {
            notificationService.sendReservationNotification(
                    new ReservationNotificationRequest(id, NotificationType.CANCELLATION));
        } catch (Exception e) {
            log.warn("NM-01 CANCELLATION trigger failed for reservation {}: {}", id, e.getMessage());
        }

        audit("RESERVATION_CANCEL", id,
                "{\"from\":\"" + prevStatus + "\",\"guestName\":\"" + esc(reservation.getGuestName()) + "\"}");
    }

    @Override
    public ReservationResponse checkIn(String id) {
        Reservation reservation = findOrThrow(id);
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }
        reservation.setStatus(ReservationStatus.CHECKED_IN);
        Reservation saved = reservationRepository.save(reservation);

        if (saved.getTableId() != null) {
            setTableStatus(saved.getTableId(), TableStatus.OCCUPIED, null);
        }

        audit("RESERVATION_CHECK_IN", saved.getId(),
                "{\"guestName\":\"" + esc(saved.getGuestName()) + "\"}");
        return enrich(saved);
    }

    @Override
    public void markNoShow(String id) {
        Reservation reservation = findOrThrow(id);
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }

        if (reservation.getTableId() != null) {
            setTableStatus(reservation.getTableId(), TableStatus.AVAILABLE, TableStatus.RESERVED);
        }

        reservation.setStatus(ReservationStatus.NO_SHOW);
        reservationRepository.save(reservation);

        if (reservation.getGuestEmail() != null && !reservation.getGuestEmail().isBlank()) {
            try {
                notificationService.sendReservationNotification(
                        new ReservationNotificationRequest(id, NotificationType.NO_SHOW));
            } catch (Exception e) {
                log.warn("NM-01 NO_SHOW trigger failed for reservation {}: {}", id, e.getMessage());
            }
        }

        audit("RESERVATION_NO_SHOW", id,
                "{\"guestName\":\"" + esc(reservation.getGuestName()) + "\"}");
    }

    /**
     * BR-04: auto-detect reservations whose 15-minute grace period has elapsed
     * without check-in, and mark them No-show. Runs offset from the reminder
     * cron's :00 tick to avoid same-instant DB contention.
     */
    @Scheduled(cron = "30 */5 * * * *")
    public void detectNoShows() {
        List<Reservation> overdue = reservationRepository.findConfirmedPastCutoff(
                LocalDateTime.now().minusMinutes(15));

        for (Reservation r : overdue) {
            try {
                markNoShow(r.getId());
            } catch (Exception e) {
                log.warn("BR-04 auto no-show failed for reservation {}: {}", r.getId(), e.getMessage());
            }
        }
    }

    /**
     * Move a CHECKED_IN reservation to a different table (e.g. group requests larger space).
     * Old table is freed to AVAILABLE; new table becomes OCCUPIED.
     */
    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public ReservationResponse transferTable(String id, String tableId) {
        Reservation reservation = findOrThrow(id);
        if (reservation.getStatus() != ReservationStatus.CHECKED_IN) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }
        validateTableExists(tableId);
        validateTableCapacity(tableId, reservation.getPartySize());
        // For table transfer, only PENDING/CONFIRMED reservations on the target table
        // can block the move. A CHECKED_IN reservation on the same table at the same
        // time would already be a data-integrity issue, and including CHECKED_IN in the
        // conflict check was incorrectly blocking legitimate transfers.
        checkTableAvailabilityForStatuses(tableId, reservation.getDatetime(), id,
                List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED));

        String oldTableId = reservation.getTableId();
        reservation.setTableId(tableId);
        Reservation saved = reservationRepository.save(reservation);

        if (oldTableId != null && !oldTableId.equals(tableId)) {
            setTableStatus(oldTableId, TableStatus.AVAILABLE, null);
        }
        setTableStatus(tableId, TableStatus.OCCUPIED, null);

        if (saved.getGuestEmail() != null && !saved.getGuestEmail().isBlank()) {
            try {
                notificationService.sendReservationNotification(
                        new ReservationNotificationRequest(saved.getId(), NotificationType.TABLE_UPDATE));
            } catch (Exception e) {
                log.warn("NM-01 TABLE_UPDATE trigger (transfer) failed for reservation {}: {}", saved.getId(), e.getMessage());
            }
        }

        audit("RESERVATION_TRANSFER_TABLE", saved.getId(),
                "{\"from\":\"" + esc(oldTableId) + "\",\"to\":\"" + esc(tableId)
                        + "\",\"guestName\":\"" + esc(saved.getGuestName()) + "\"}");
        return enrich(saved);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void audit(String action, String id, String detail) {
        try { auditService.log(action, "Reservation", id, detail); }
        catch (Exception e) { log.warn("Audit log failed: {}", e.getMessage()); }
    }

    private static String esc(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private Reservation findOrThrow(String id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.RESERVATION_NOT_FOUND));
    }

    private void validateTableExists(String tableId) {
        if (!tableRepository.existsById(tableId)) {
            throw new ResourceNotFoundException(ApplicationError.TABLE_NOT_FOUND);
        }
    }

    private void validateTableCapacity(String tableId, int partySize) {
        tableRepository.findById(tableId).ifPresent(t -> {
            if (partySize > t.getCapacity()) {
                throw new ApplicationException(ApplicationError.TABLE_CAPACITY_EXCEEDED);
            }
        });
    }

    /**
     * Uses a pessimistic write lock so concurrent table-assignment requests are serialized.
     * Window logic: booking at T blocks [T-180min, T+180min) on its table (strict inequality
     * means bookings exactly 180 min apart do NOT conflict).
     */
    private void checkTableAvailability(String tableId, LocalDateTime datetime, String excludeId) {
        checkTableAvailabilityForStatuses(tableId, datetime, excludeId, ACTIVE_STATUSES);
    }

    /**
     * Flexible variant — caller chooses which statuses count as conflicts.
     * Used by transferTable() to avoid blocking on CHECKED_IN rows.
     */
    private void checkTableAvailabilityForStatuses(String tableId, LocalDateTime datetime,
                                                    String excludeId, List<ReservationStatus> statuses) {
        LocalDateTime windowStart = datetime.minusMinutes(60);
        LocalDateTime windowEnd   = datetime.plusMinutes(120);
        List<Reservation> conflicts = reservationRepository.findConflictingForUpdate(
                tableId, statuses, windowStart, windowEnd,
                excludeId != null ? excludeId : "");
        if (!conflicts.isEmpty()) {
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

    private void setTableStatus(String tableId, TableStatus newStatus, TableStatus onlyIfCurrent) {
        tableRepository.findById(tableId).ifPresent(t -> {
            if (onlyIfCurrent == null || t.getStatus() == onlyIfCurrent) {
                t.setStatus(newStatus);
                RestaurantTable saved = tableRepository.save(t);
                realtimeEventPublisher.publishTableStatus(saved);
            }
        });
    }

    private ReservationResponse enrich(Reservation r) {
        Map<String, RestaurantTable> tableMap = r.getTableId() == null ? Collections.emptyMap() :
                tableRepository.findAllById(List.of(r.getTableId())).stream()
                        .collect(Collectors.toMap(RestaurantTable::getId, t -> t));
        return toResponse(r, tableMap);
    }

    private ReservationResponse toResponse(Reservation r, Map<String, RestaurantTable> tableMap) {
        RestaurantTable t = r.getTableId() != null ? tableMap.get(r.getTableId()) : null;
        return new ReservationResponse(
                r.getId(),
                r.getTableId(),
                t != null ? t.getName() : null,
                t != null ? t.getArea() : null,
                r.getGuestName(),
                r.getPhone(),
                r.getGuestEmail(),
                r.getPartySize(),
                r.getDatetime(),
                r.getNote(),
                r.getStatus(),
                r.getCreatedAt()
        );
    }
}
