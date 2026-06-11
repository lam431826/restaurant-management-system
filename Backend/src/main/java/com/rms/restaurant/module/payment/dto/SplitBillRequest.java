package com.rms.restaurant.module.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SplitBillRequest(@NotBlank String invoiceId, @NotEmpty List<String> itemIds) {}
