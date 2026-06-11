package com.rms.restaurant.module.table.service;

import com.rms.restaurant.module.table.dto.*;

import java.util.List;

public interface TableService {
    List<TableResponse> listAll();
    TableResponse getById(String id);
    TableResponse updateStatus(String id, TableStatusUpdateRequest request);
    void transfer(TransferTableRequest request);
    void merge(MergeTableRequest request);
}
