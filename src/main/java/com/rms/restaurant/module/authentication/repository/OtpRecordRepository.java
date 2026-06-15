package com.rms.restaurant.module.authentication.repository;

import com.rms.restaurant.module.authentication.model.OtpRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface OtpRecordRepository extends JpaRepository<OtpRecord, String> {
    Optional<OtpRecord> findByVerifyTokenAndUsedFalse(String verifyToken);
    long countByUserIdAndCreatedAtAfter(String userId, LocalDateTime since);
}
