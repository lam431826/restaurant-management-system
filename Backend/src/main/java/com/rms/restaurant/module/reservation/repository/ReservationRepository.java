package com.rms.restaurant.module.reservation.repository;

import com.rms.restaurant.common.utils.enums.ReservationStatus;
import com.rms.restaurant.module.reservation.model.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, String> {
    List<Reservation> findByDatetimeBetweenAndStatus(LocalDateTime from, LocalDateTime to, ReservationStatus status);
    List<Reservation> findByTableIdAndStatus(String tableId, ReservationStatus status);
}
