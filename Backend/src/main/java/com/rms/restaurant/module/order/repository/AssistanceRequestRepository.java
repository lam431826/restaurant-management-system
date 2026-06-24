package com.rms.restaurant.module.order.repository;

import com.rms.restaurant.module.order.model.AssistanceRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssistanceRequestRepository extends JpaRepository<AssistanceRequest, String> {
    List<AssistanceRequest> findByTableIdAndResolvedFalse(String tableId);
    List<AssistanceRequest> findByResolvedFalse();
}
