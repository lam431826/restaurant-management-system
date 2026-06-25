package com.rms.restaurant.module.roster.dto;

import com.rms.restaurant.common.utils.enums.UserRole;

public record StaffSummaryResponse(String id, String fullName, UserRole role) {}
