package com.rms.restaurant.module.table.dto;

import com.rms.restaurant.common.utils.enums.TableStatus;

public record TableResponse(
        String id,
        String name,
        String note,
        String area,
        int capacity,
        int displayOrder,
        boolean active,
        TableStatus status,
        String qrToken
) {}
