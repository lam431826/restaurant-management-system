package com.rms.restaurant.module.roster.repository;

import com.rms.restaurant.module.roster.model.WeekPublication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;

public interface WeekPublicationRepository extends JpaRepository<WeekPublication, LocalDate> {
}
