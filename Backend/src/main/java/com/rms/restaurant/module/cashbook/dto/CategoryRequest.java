package com.rms.restaurant.module.cashbook.dto;

import com.rms.restaurant.common.utils.enums.CashFlowType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @NotBlank @Size(max = 150) String name,
        @NotNull CashFlowType type,
        @Size(max = 500) String description,
        boolean accountingToIncome
) {}
