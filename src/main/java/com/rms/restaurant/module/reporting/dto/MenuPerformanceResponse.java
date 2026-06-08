package com.rms.restaurant.module.reporting.dto;

import java.math.BigDecimal;
import java.util.List;

public record MenuPerformanceResponse(List<ItemStat> topItems, List<ItemStat> bottomItems) {
    public record ItemStat(String menuItemId, String name, int totalQuantity, BigDecimal totalRevenue) {}
}
