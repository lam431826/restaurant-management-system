package com.rms.restaurant.module.menu.dto;

import java.util.List;

public record ImportResultResponse(int created, int updated, int failed, List<RowError> errors) {

    public record RowError(int row, String reason) {}
}
