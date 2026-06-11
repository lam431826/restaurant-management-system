package com.rms.restaurant.module.table.dto;

import com.rms.restaurant.common.utils.enums.TableStatus;
import jakarta.validation.constraints.NotNull;

public record TableStatusUpdateRequest(@NotNull TableStatus status) {}
