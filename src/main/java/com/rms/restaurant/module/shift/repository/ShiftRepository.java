package com.rms.restaurant.module.shift.repository;

import com.rms.restaurant.module.shift.model.Shift;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShiftRepository extends JpaRepository<Shift, String> {
<<<<<<< HEAD
    // BR-SH-02: only one OPEN shift system-wide
    Optional<Shift> findByStatus(String status);

    Optional<Shift> findByCashierIdAndStatus(String cashierId, String status);

=======
    Optional<Shift> findByStatus(String status);
    Optional<Shift> findByCashierIdAndStatus(String cashierId, String status);
>>>>>>> origin/develop
    Page<Shift> findAllByOrderByOpenedAtDesc(Pageable pageable);
}
