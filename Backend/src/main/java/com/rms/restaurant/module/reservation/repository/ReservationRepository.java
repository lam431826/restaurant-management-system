package com.rms.restaurant.module.reservation.repository;

import com.rms.restaurant.common.utils.enums.ReservationStatus;
import com.rms.restaurant.module.reservation.model.Reservation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, String> {

    List<Reservation> findByDatetimeBetweenAndStatus(LocalDateTime from, LocalDateTime to, ReservationStatus status);

    List<Reservation> findByTableIdAndStatus(String tableId, ReservationStatus status);

    Optional<Reservation> findFirstByTableIdAndStatusOrderByDatetimeAsc(String tableId, ReservationStatus status);

    // BE-TBL-05: guard deleteTable() with a clean error instead of a raw FK-constraint 500
    boolean existsByTableId(String tableId);

    @Query("SELECT r FROM Reservation r WHERE r.status = com.rms.restaurant.common.utils.enums.ReservationStatus.CONFIRMED " +
           "AND r.datetime BETWEEN :from AND :to AND r.reminderSent = false")
    List<Reservation> findConfirmedBetweenAndReminderNotSent(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to
    );

    /**
     * BR-04: CONFIRMED reservations whose grace period (reserved time + 15 min) has elapsed
     * and the guest hasn't checked in. Self-guarding — markNoShow() flips status away from
     * CONFIRMED, which removes the row from the next cron tick without needing a flag column.
     */
    @Query("SELECT r FROM Reservation r WHERE r.status = com.rms.restaurant.common.utils.enums.ReservationStatus.CONFIRMED " +
           "AND r.datetime <= :cutoff")
    List<Reservation> findConfirmedPastCutoff(@Param("cutoff") LocalDateTime cutoff);

    /**
     * Pessimistic write lock to serialize concurrent table-assignment requests.
     * Returns active reservations on the same table whose 3-hour window overlaps.
     * Pass excludeId="" for new reservations (nothing to exclude).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Reservation r " +
           "WHERE r.tableId = :tableId " +
           "AND r.status IN :statuses " +
           "AND r.id <> :excludeId " +
           "AND r.datetime > :windowStart " +
           "AND r.datetime < :windowEnd")
    List<Reservation> findConflictingForUpdate(
            @Param("tableId")     String tableId,
            @Param("statuses")    List<ReservationStatus> statuses,
            @Param("windowStart") LocalDateTime windowStart,
            @Param("windowEnd")   LocalDateTime windowEnd,
            @Param("excludeId")   String excludeId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Reservation r " +
           "WHERE r.tableId IN :tableIds " +
           "AND (r.status = :checkedInStatus " +
           "OR (r.status IN :scheduledStatuses " +
           "AND r.datetime > :windowStart " +
           "AND r.datetime < :windowEnd)) " +
           "ORDER BY r.tableId ASC, r.datetime ASC, r.id ASC")
    List<Reservation> findBlockingForTablesForUpdate(
            @Param("tableIds")          List<String> tableIds,
            @Param("checkedInStatus")   ReservationStatus checkedInStatus,
            @Param("scheduledStatuses") List<ReservationStatus> scheduledStatuses,
            @Param("windowStart")       LocalDateTime windowStart,
            @Param("windowEnd")         LocalDateTime windowEnd
    );

    /**
     * Count active reservations whose 3-hour window overlaps with a given datetime.
     * Used for public-booking overbooking prevention.
     */
    @Query("SELECT COUNT(r) FROM Reservation r " +
           "WHERE r.status IN :statuses " +
           "AND r.datetime > :windowStart " +
           "AND r.datetime < :windowEnd")
    long countActiveInWindow(
            @Param("statuses")    List<ReservationStatus> statuses,
            @Param("windowStart") LocalDateTime windowStart,
            @Param("windowEnd")   LocalDateTime windowEnd
    );

    /**
     * Count active reservations for a specific set of tables in the time window.
     * Used for tier-based overbooking check (only tables in the party's capacity tier count).
     * Caller must ensure tableIds is non-empty to avoid IN (:empty) JPQL error.
     */
    @Query("SELECT COUNT(r) FROM Reservation r " +
           "WHERE r.status IN :statuses " +
           "AND r.datetime > :windowStart " +
           "AND r.datetime < :windowEnd " +
           "AND r.tableId IN :tableIds")
    long countActiveInWindowForTables(
            @Param("statuses")    List<ReservationStatus> statuses,
            @Param("windowStart") LocalDateTime windowStart,
            @Param("windowEnd")   LocalDateTime windowEnd,
            @Param("tableIds")    List<String> tableIds
    );

    /**
     * Count active reservations in the time window whose party size falls in a given tier
     * range, regardless of whether a table has been assigned yet. BE-RES-03 fix:
     * countActiveInWindowForTables (above) only counts reservations that already HAVE a
     * tableId, but online-created reservations never get one at creation time — so the
     * tier-overbooking guard needs to count by demand (party-size tier), not by already-
     * consumed supply (assigned tableId), or it never triggers for the normal online flow.
     */
    @Query("SELECT COUNT(r) FROM Reservation r " +
           "WHERE r.status IN :statuses " +
           "AND r.datetime > :windowStart " +
           "AND r.datetime < :windowEnd " +
           "AND r.partySize BETWEEN :minPartySize AND :maxPartySize")
    long countActiveInWindowByPartySizeRange(
            @Param("statuses")     List<ReservationStatus> statuses,
            @Param("windowStart")  LocalDateTime windowStart,
            @Param("windowEnd")    LocalDateTime windowEnd,
            @Param("minPartySize") int minPartySize,
            @Param("maxPartySize") int maxPartySize
    );
}
