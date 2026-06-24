package com.rms.restaurant.module.table.dto;

import java.util.List;

public record TableImportResult(int created, int updated, int failed, List<RowError> errors) {

    public record RowError(int row, String reason) {}
}
