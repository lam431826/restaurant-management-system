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

    @Query("SELECT r FROM Reservation r WHERE r.status = com.rms.restaurant.common.utils.enums.ReservationStatus.CONFIRMED " +
           "AND r.datetime BETWEEN :from AND :to AND r.reminderSent = false")
    List<Reservation> findConfirmedBetweenAndReminderNotSent(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to
    );

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
}
