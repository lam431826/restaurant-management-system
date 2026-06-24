package com.rms.restaurant.module.order.dto;

import com.rms.restaurant.common.utils.enums.CookingStatus;

public record UpdateOrderItemStatusRequest(CookingStatus status) {}
