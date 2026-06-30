package com.rms.restaurant.module.shift.repository;

import com.rms.restaurant.module.shift.model.Shift;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ShiftRepository extends JpaRepository<Shift, String> {

    // BR-CS-01: a cashier's single OPEN shift
    Optional<Shift> findByCashierIdAndStatus(String cashierId, String status);

    Page<Shift> findAllByOrderByOpenedAtDesc(Pageable pageable);

    // CS-05: all shifts opened within a day window (legacy / fallback)
    List<Shift> findByOpenedAtBetweenOrderByOpenedAtAsc(LocalDateTime start, LocalDateTime end);

    // CS-05 / BR-CS-14: all shifts belonging to a business date
    List<Shift> findByBusinessDateOrderByOpenedAtAsc(LocalDate businessDate);

    // BR-CS-09/11: the cashier's most recently closed shift (for handover carry-over)
    Optional<Shift> findFirstByCashierIdAndStatusInOrderByClosedAtDesc(
            String cashierId, Collection<String> statuses);
}
