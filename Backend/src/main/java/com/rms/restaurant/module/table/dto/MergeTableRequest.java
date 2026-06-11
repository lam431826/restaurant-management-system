package com.rms.restaurant.module.table.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record MergeTableRequest(@NotEmpty List<String> tableIds, @NotEmpty String targetTableId) {}
