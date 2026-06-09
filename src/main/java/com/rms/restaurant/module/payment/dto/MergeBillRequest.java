package com.rms.restaurant.module.payment.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record MergeBillRequest(@NotEmpty List<String> invoiceIds) {}
