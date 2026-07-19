package com.rms.restaurant.module.payroll.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.math.BigDecimal;
import java.util.List;

/** UC-PAY-04 / BR-PAY-11: manual edits on a Draft sheet. Null value = field untouched. */
public record SaveDraftRequest(@NotEmpty @Valid List<DraftRow> rows) {

    public record DraftRow(
            @NotBlank String payslipId,
            @DecimalMin("0") BigDecimal mainSalary,
            @DecimalMin("0") BigDecimal overtimeSalary,
            @DecimalMin("0") BigDecimal deduction
    ) {}
}
