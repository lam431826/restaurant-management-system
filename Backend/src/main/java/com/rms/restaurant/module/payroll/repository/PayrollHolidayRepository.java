package com.rms.restaurant.module.payroll.repository;

import com.rms.restaurant.module.payroll.model.PayrollHoliday;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface PayrollHolidayRepository extends JpaRepository<PayrollHoliday, String> {

    List<PayrollHoliday> findAllByOrderByHolidayDateAsc();

    boolean existsByHolidayDate(LocalDate date);

    boolean existsByHolidayDateAndIdNot(LocalDate date, String id);

    /** BR-PAY-04: holidays overlapping one payroll sheet's period, for SalaryCalculator. */
    List<PayrollHoliday> findAllByHolidayDateBetween(LocalDate start, LocalDate end);
}
