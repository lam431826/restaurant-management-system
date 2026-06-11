package com.rms.restaurant.module.menu.dto;

import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record UpdateMenuItemRequest(String name, @Positive BigDecimal price, String description, Boolean available) {}
