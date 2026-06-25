package com.rms.restaurant.module.roster.repository;

import com.rms.restaurant.common.utils.enums.ShiftRequestStatus;
import com.rms.restaurant.module.roster.model.RosterRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface RosterRequestRepository extends JpaRepository<RosterRequest, String> {
    List<RosterRequest> findAllByOrderByCreatedAtDesc();

    boolean existsByRequesterIdAndWorkDateAndShiftTemplateIdAndStatus(
            String requesterId, LocalDate workDate, String shiftTemplateId, ShiftRequestStatus status);
}
