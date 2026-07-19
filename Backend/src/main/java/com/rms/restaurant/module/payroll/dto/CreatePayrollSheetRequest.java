package com.rms.restaurant.module.payroll.dto;

import com.rms.restaurant.common.utils.enums.PayrollScope;
import com.rms.restaurant.common.utils.enums.PayrollTerm;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/** UC-PAY-03. Name is optional — defaults to "Bảng lương tháng M/yyyy" for monthly periods. */
public record CreatePayrollSheetRequest(
        @Size(max = 150) String name,
        @NotNull PayrollTerm term,
        @NotNull LocalDate periodStart,
        @NotNull LocalDate periodEnd,
        @NotNull PayrollScope scope,
        List<String> employeeIds,
        @Size(max = 1000) String note
) {}
