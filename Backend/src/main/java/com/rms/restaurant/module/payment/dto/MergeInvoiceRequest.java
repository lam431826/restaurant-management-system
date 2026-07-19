package com.rms.restaurant.module.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record MergeInvoiceRequest(
        @NotNull
        @Size(min = 2, max = 100)
        List<@NotBlank String> invoiceIds
) {}
