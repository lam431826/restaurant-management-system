package com.rms.restaurant.module.reservation.repository;

import com.rms.restaurant.common.utils.enums.ReservationStatus;
import com.rms.restaurant.module.reservation.model.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, String> {

    List<Reservation> findByDatetimeBetweenAndStatus(LocalDateTime from, LocalDateTime to, ReservationStatus status);

    List<Reservation> findByTableIdAndStatus(String tableId, ReservationStatus status);

    // Cho cron reminder NM-01: tìm reservation CONFIRMED sắp đến mà chưa gửi reminder
    @Query("SELECT r FROM Reservation r WHERE r.status = com.rms.restaurant.common.utils.enums.ReservationStatus.CONFIRMED " +
           "AND r.datetime BETWEEN :from AND :to AND r.reminderSent = false")
    List<Reservation> findConfirmedBetweenAndReminderNotSent(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to
    );
}
