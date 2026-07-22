package com.rms.restaurant.module.reporting.dto;

import com.rms.restaurant.common.utils.enums.FinancialLineGroup;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** group is required on create; ignored on update (a line's group never changes once created). */
public record FinancialCustomLineRequest(
        @NotNull FinancialLineGroup group,
        @NotBlank String name
) {}
