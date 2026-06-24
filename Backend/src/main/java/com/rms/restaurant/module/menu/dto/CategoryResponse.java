package com.rms.restaurant.module.menu.dto;

public record CategoryResponse(String id, String name, int displayOrder, String icon, long itemCount) {}
