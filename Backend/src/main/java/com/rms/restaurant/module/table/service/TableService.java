package com.rms.restaurant.module.table.service;

import com.rms.restaurant.common.utils.enums.TableStatus;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.table.dto.*;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface TableService {

    // Tables
    PageResponse<TableResponse> search(String q, String area, Boolean active, Pageable pageable);
    TableResponse getById(String id);
    TableResponse createTable(CreateTableRequest request);
    TableResponse updateTable(String id, UpdateTableRequest request);
    void deleteTable(String id);
    void setActive(String id, boolean active);
    TableResponse updateStatus(String id, TableStatusUpdateRequest request);

    // Import / Export
    byte[] exportCsv();
    TableImportResult importCsv(org.springframework.web.multipart.MultipartFile file);

    // Areas (zones)
    List<AreaResponse> listAreas();
    AreaResponse createArea(AreaRequest request);
    void deleteArea(String id);

    // Order-session operations (TM-04) — not yet implemented
    void transfer(TransferTableRequest request);
    void merge(MergeTableRequest request);
}
