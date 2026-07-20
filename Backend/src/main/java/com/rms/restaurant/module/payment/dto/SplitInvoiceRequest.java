package com.rms.restaurant.module.payment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SplitInvoiceRequest(
        @NotNull
        @Size(min = 2)
        List<@NotNull @Valid SplitInvoiceGroupRequest> groups
) {}
