package com.rms.restaurant.module.order.dto;

import jakarta.validation.constraints.NotBlank;

public record AssistanceRespondRequest(@NotBlank String assistanceRequestId) {}
