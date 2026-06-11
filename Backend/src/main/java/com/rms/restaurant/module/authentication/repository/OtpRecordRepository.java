package com.rms.restaurant.module.authentication.repository;

import com.rms.restaurant.module.authentication.model.OtpRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface OtpRecordRepository extends JpaRepository<OtpRecord, String> {
    Optional<OtpRecord> findByVerifyTokenAndUsedFalse(String verifyToken);
    long countByUserIdAndCreatedAtAfter(String userId, LocalDateTime since);
}
