package com.rms.restaurant.module.table.dto;

import com.rms.restaurant.common.utils.enums.TableStatus;

public record TableResponse(String id, String name, int capacity, String area, TableStatus status) {}
