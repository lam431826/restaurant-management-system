package com.rms.restaurant.module.table.service.impl;

import com.rms.restaurant.module.table.dto.*;
import com.rms.restaurant.module.table.service.TableService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TableServiceImpl implements TableService {

    @Override public List<TableResponse> listAll() { return null; }
    @Override public TableResponse getById(String id) { return null; }
    @Override public TableResponse updateStatus(String id, TableStatusUpdateRequest request) { return null; }
    @Override public void transfer(TransferTableRequest request) {}
    @Override public void merge(MergeTableRequest request) {}
}
