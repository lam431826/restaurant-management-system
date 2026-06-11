package com.rms.restaurant.module.menu.dto;

import jakarta.validation.constraints.NotBlank;

public record CategoryRequest(@NotBlank String name, int displayOrder, String icon) {}
