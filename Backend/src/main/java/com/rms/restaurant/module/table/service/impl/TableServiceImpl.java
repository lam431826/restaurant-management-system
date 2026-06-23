package com.rms.restaurant.module.table.service.impl;

import com.rms.restaurant.common.utils.enums.TableStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ConflictException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.table.dto.*;
import com.rms.restaurant.module.table.mapper.TableMapper;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.table.repository.TableRepository;
import com.rms.restaurant.module.table.service.TableService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class TableServiceImpl implements TableService {

    private final TableRepository tableRepository;
    private final TableMapper tableMapper;

    // ── TM-01: Danh sách bàn ─────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<TableResponse> listAll(TableStatus status) {
        List<RestaurantTable> tables = (status != null)
                ? tableRepository.findByStatus(status)
                : tableRepository.findAllByOrderByAreaAscNameAsc();
        return tables.stream().map(tableMapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TableResponse getById(String id) {
        return tableMapper.toResponse(findOrThrow(id));
    }

    // ── TM-CRUD: Quản lý bàn (MANAGER/ADMIN) ─────────────────────────────────

    @Override
    public TableResponse create(CreateTableRequest request) {
        if (tableRepository.existsByName(request.name())) {
            throw new ConflictException(ApplicationError.DUPLICATE_TABLE_NAME);
        }
        RestaurantTable table = RestaurantTable.builder()
                .name(request.name())
                .capacity(request.capacity())
                .area(request.area())
                .status(TableStatus.AVAILABLE)
                .qrToken(UUID.randomUUID().toString())
                .build();
        RestaurantTable saved = tableRepository.save(table);
        log.info("Created table '{}' (area={})", saved.getName(), saved.getArea());
        return tableMapper.toResponse(saved);
    }

    @Override
    public TableResponse update(String id, UpdateTableRequest request) {
        RestaurantTable table = findOrThrow(id);
        if (request.name() != null && !request.name().equals(table.getName())) {
            if (tableRepository.existsByNameAndIdNot(request.name(), id)) {
                throw new ConflictException(ApplicationError.DUPLICATE_TABLE_NAME);
            }
            table.setName(request.name());
        }
        if (request.capacity() != null) table.setCapacity(request.capacity());
        if (request.area() != null)     table.setArea(request.area());
        return tableMapper.toResponse(tableRepository.save(table));
    }

    @Override
    public void delete(String id) {
        RestaurantTable table = findOrThrow(id);
        if (table.getStatus() == TableStatus.OCCUPIED
                || table.getStatus() == TableStatus.BILLING
                || table.getStatus() == TableStatus.RESERVED) {
            throw new ApplicationException(ApplicationError.TABLE_IN_USE);
        }
        tableRepository.delete(table);
        log.info("Deleted table '{}' ({})", table.getName(), id);
    }

    // ── TM-02: Cập nhật trạng thái bàn ──────────────────────────────────────

    @Override
    public TableResponse updateStatus(String id, TableStatusUpdateRequest request) {
        RestaurantTable table = findOrThrow(id);
        TableStatus prev = table.getStatus();
        table.setStatus(request.status());
        RestaurantTable saved = tableRepository.save(table);
        log.info("Table '{}': {} → {}", table.getName(), prev, request.status());
        return tableMapper.toResponse(saved);
    }

    // ── TM-04: Tạo / làm mới QR token ───────────────────────────────────────

    @Override
    public TableResponse regenerateQrToken(String id) {
        RestaurantTable table = findOrThrow(id);
        table.setQrToken(UUID.randomUUID().toString());
        RestaurantTable saved = tableRepository.save(table);
        log.info("Regenerated QR token for table '{}'", table.getName());
        return tableMapper.toResponse(saved);
    }

    // ── TM-03: Chuyển bàn ────────────────────────────────────────────────────

    @Override
    public void transfer(TransferTableRequest request) {
        RestaurantTable from = findOrThrow(request.fromTableId());
        RestaurantTable to   = findOrThrow(request.toTableId());

        if (from.getStatus() == TableStatus.AVAILABLE) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }
        if (to.getStatus() != TableStatus.AVAILABLE) {
            throw new ApplicationException(ApplicationError.TABLE_NOT_AVAILABLE);
        }

        to.setStatus(from.getStatus());
        from.setStatus(TableStatus.AVAILABLE);
        tableRepository.save(from);
        tableRepository.save(to);
        log.info("Transferred '{}' ({}) → '{}'", from.getName(), to.getStatus(), to.getName());
    }

    // ── TM-05: Ghép bàn ──────────────────────────────────────────────────────

    @Override
    public void merge(MergeTableRequest request) {
        RestaurantTable target = findOrThrow(request.targetTableId());
        for (String tableId : request.tableIds()) {
            if (tableId.equals(request.targetTableId())) continue;
            RestaurantTable t = findOrThrow(tableId);
            t.setStatus(target.getStatus());
            tableRepository.save(t);
        }
        log.info("Merged {} table(s) with target '{}'", request.tableIds().size(), target.getName());
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private RestaurantTable findOrThrow(String id) {
        return tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.TABLE_NOT_FOUND));
    }
}
