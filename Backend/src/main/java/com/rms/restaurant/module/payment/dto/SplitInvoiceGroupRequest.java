package com.rms.restaurant.module.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SplitInvoiceGroupRequest(
        @NotNull
        @Size(min = 1)
        List<@NotBlank String> allocationIds
) {}
