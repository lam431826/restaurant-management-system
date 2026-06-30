package com.rms.restaurant.module.shift.repository;

import com.rms.restaurant.module.shift.model.Shift;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ShiftRepository extends JpaRepository<Shift, String> {
    // BR-SH-02: only one OPEN shift system-wide
    Optional<Shift> findByStatus(String status);

    Optional<Shift> findByCashierIdAndStatus(String cashierId, String status);

    Page<Shift> findAllByOrderByOpenedAtDesc(Pageable pageable);

    // CS-05: all shifts opened within a day window
    List<Shift> findByOpenedAtBetweenOrderByOpenedAtAsc(LocalDateTime start, LocalDateTime end);
}
