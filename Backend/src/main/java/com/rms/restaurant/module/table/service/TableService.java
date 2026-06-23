package com.rms.restaurant.module.table.service;

import com.rms.restaurant.common.utils.enums.TableStatus;
import com.rms.restaurant.module.table.dto.*;

import java.util.List;

public interface TableService {
    List<TableResponse> listAll(TableStatus status);
    TableResponse getById(String id);
    TableResponse create(CreateTableRequest request);
    TableResponse update(String id, UpdateTableRequest request);
    void delete(String id);
    TableResponse updateStatus(String id, TableStatusUpdateRequest request);
    TableResponse regenerateQrToken(String id);
    void transfer(TransferTableRequest request);
    void merge(MergeTableRequest request);
}
