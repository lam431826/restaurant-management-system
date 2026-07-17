package com.rms.restaurant.module.employee.dto;

import java.util.List;

public record EmployeeImportResultResponse(int created, int updated, int failed, List<RowError> errors) {

    public record RowError(int row, String reason) {}
}
