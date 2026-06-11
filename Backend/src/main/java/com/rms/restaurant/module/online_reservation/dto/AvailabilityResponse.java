package com.rms.restaurant.module.online_reservation.dto;

import java.util.List;

public record AvailabilityResponse(List<String> availableSlots, List<TableSlot> tables) {
    public record TableSlot(String tableId, String tableName, int capacity) {}
}
