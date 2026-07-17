package com.rms.restaurant.module.table.service.impl;

import com.rms.restaurant.common.utils.enums.TableStatus;
import com.rms.restaurant.common.utils.enums.ReservationStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ConflictException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.reservation.repository.ReservationRepository;
import com.rms.restaurant.module.table.dto.*;
import com.rms.restaurant.module.table.mapper.TableMapper;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.table.model.TableArea;
import com.rms.restaurant.module.table.repository.TableAreaRepository;
import com.rms.restaurant.module.table.repository.TableRepository;
import com.rms.restaurant.module.table.service.TableService;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.common.utils.enums.OrderStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class TableServiceImpl implements TableService {

    private static final String[] CSV_HEADERS = {"name", "area", "capacity", "note", "displayOrder", "active"};
    private static final List<OrderStatus> TERMINAL_ORDER_STATUSES =
            List.of(OrderStatus.CLOSED, OrderStatus.CANCELLED);
    private static final List<ReservationStatus> SCHEDULED_BLOCKING_RESERVATION_STATUSES =
            List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED);
    private static final int RESERVATION_WINDOW_BEFORE_MINUTES = 60;
    private static final int RESERVATION_WINDOW_AFTER_MINUTES = 120;

    private final TableRepository tableRepository;
    private final TableAreaRepository areaRepository;
    private final TableMapper tableMapper;
    private final OrderRepository orderRepository;
    private final InvoiceRepository invoiceRepository;
    private final ReservationRepository reservationRepository;

    // ── Tables ───────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<TableResponse> listAll() {
        return tableRepository.findAllByOrderByDisplayOrderAscNameAsc().stream()
                .map(table -> tableMapper.toResponse(table, findActiveOrderId(table.getId())))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public TableResponse getById(String id) {
        RestaurantTable table = findTable(id);
        return tableMapper.toResponse(table, findActiveOrderId(table.getId()));
    }

    @Override
    public TableResponse createTable(CreateTableRequest request) {
        String name = request.name().trim();
        if (tableRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException(ApplicationError.DUPLICATE_TABLE_NAME);
        }
        RestaurantTable table = RestaurantTable.builder()
                .name(name)
                .note(trimToNull(request.note()))
                .area(trimToNull(request.area()))
                .capacity(request.capacity() == null ? 0 : request.capacity())
                .displayOrder(request.displayOrder() == null ? 0 : request.displayOrder())
                .active(request.active() == null || request.active())
                .status(TableStatus.AVAILABLE)
                .qrToken(UUID.randomUUID().toString())
                .build();
        return tableMapper.toResponse(tableRepository.save(table));
    }

    @Override
    public TableResponse updateTable(String id, UpdateTableRequest request) {
        RestaurantTable table = findTable(id);
        if (StringUtils.hasText(request.name())) {
            String newName = request.name().trim();
            if (!newName.equalsIgnoreCase(table.getName()) && tableRepository.existsByNameIgnoreCase(newName)) {
                throw new ConflictException(ApplicationError.DUPLICATE_TABLE_NAME);
            }
            table.setName(newName);
        }
        if (request.note() != null) table.setNote(trimToNull(request.note()));
        if (request.area() != null) table.setArea(trimToNull(request.area()));
        if (request.capacity() != null) table.setCapacity(request.capacity());
        if (request.displayOrder() != null) table.setDisplayOrder(request.displayOrder());
        if (request.active() != null) table.setActive(request.active());
        return tableMapper.toResponse(tableRepository.save(table));
    }

    @Override
    public void deleteTable(String id) {
        tableRepository.delete(findTable(id));
    }

    @Override
    public void setActive(String id, boolean active) {
        RestaurantTable table = findTable(id);
        table.setActive(active);
        tableRepository.save(table);
    }

    @Override
    public TableResponse updateStatus(String id, TableStatusUpdateRequest request) {
        RestaurantTable table = findTable(id);
        table.setStatus(request.status());
        return tableMapper.toResponse(tableRepository.save(table));
    }

    // ── Import / Export ──────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv() {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        // UTF-8 BOM so Excel renders Vietnamese characters correctly
        out.write(0xEF);
        out.write(0xBB);
        out.write(0xBF);
        try (CSVPrinter printer = new CSVPrinter(
                new OutputStreamWriter(out, StandardCharsets.UTF_8),
                CSVFormat.DEFAULT.builder().setHeader(CSV_HEADERS).build())) {
            for (RestaurantTable table : tableRepository.findAllByOrderByDisplayOrderAscNameAsc()) {
                printer.printRecord(
                        table.getName(),
                        nullSafe(table.getArea()),
                        table.getCapacity(),
                        nullSafe(table.getNote()),
                        table.getDisplayOrder(),
                        table.isActive() ? "true" : "false"
                );
            }
            printer.flush();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }

    @Override
    public TableImportResult importCsv(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ConflictException(ApplicationError.TABLE_IMPORT_INVALID);
        }

        // Track known area names (lowercased) so unknown areas are auto-created.
        Set<String> knownAreas = areaRepository.findAll().stream()
                .map(a -> a.getName().toLowerCase())
                .collect(Collectors.toCollection(HashSet::new));

        int created = 0;
        int updated = 0;
        List<TableImportResult.RowError> errors = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader().setSkipHeaderRecord(true).setTrim(true).setIgnoreEmptyLines(true).build()
                     .parse(reader)) {

            for (CSVRecord record : parser) {
                long rowNumber = record.getRecordNumber() + 1; // +1 to account for header row
                try {
                    String name = column(record, "name");
                    if (!StringUtils.hasText(name)) {
                        errors.add(new TableImportResult.RowError((int) rowNumber, "Name is required"));
                        continue;
                    }
                    int capacity = 0;
                    String capacityRaw = column(record, "capacity");
                    if (StringUtils.hasText(capacityRaw)) {
                        try {
                            capacity = Integer.parseInt(capacityRaw.trim());
                        } catch (NumberFormatException ex) {
                            errors.add(new TableImportResult.RowError((int) rowNumber, "Invalid capacity"));
                            continue;
                        }
                        if (capacity < 0) {
                            errors.add(new TableImportResult.RowError((int) rowNumber, "Capacity must not be negative"));
                            continue;
                        }
                    }
                    int displayOrder = 0;
                    String orderRaw = column(record, "displayOrder");
                    if (StringUtils.hasText(orderRaw)) {
                        try {
                            displayOrder = Integer.parseInt(orderRaw.trim());
                        } catch (NumberFormatException ex) {
                            errors.add(new TableImportResult.RowError((int) rowNumber, "Invalid displayOrder"));
                            continue;
                        }
                    }
                    String area = trimToNull(column(record, "area"));
                    String note = trimToNull(column(record, "note"));
                    boolean active = parseBoolean(column(record, "active"));

                    RestaurantTable table = tableRepository.findByNameIgnoreCase(name).orElse(null);
                    boolean isNew = table == null;
                    if (isNew) {
                        table = RestaurantTable.builder()
                                .name(name)
                                .status(TableStatus.AVAILABLE)
                                .qrToken(UUID.randomUUID().toString())
                                .build();
                    }
                    table.setArea(area);
                    table.setNote(note);
                    table.setCapacity(capacity);
                    table.setDisplayOrder(displayOrder);
                    table.setActive(active);
                    tableRepository.save(table);

                    // Auto-create the area so it appears in the sidebar list.
                    if (area != null && !knownAreas.contains(area.toLowerCase())) {
                        areaRepository.save(TableArea.builder().name(area).displayOrder(knownAreas.size()).build());
                        knownAreas.add(area.toLowerCase());
                    }

                    if (isNew) created++; else updated++;
                } catch (Exception rowEx) {
                    errors.add(new TableImportResult.RowError((int) rowNumber, "Could not process row: " + rowEx.getMessage()));
                }
            }
        } catch (IOException e) {
            throw new ConflictException(ApplicationError.TABLE_IMPORT_INVALID);
        }

        return new TableImportResult(created, updated, errors.size(), errors);
    }

    // ── Areas ────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<AreaResponse> listAreas() {
        return areaRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(tableMapper::toAreaResponse)
                .collect(Collectors.toList());
    }

    @Override
    public AreaResponse createArea(AreaRequest request) {
        String name = request.name().trim();
        if (areaRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException(ApplicationError.DUPLICATE_AREA_NAME);
        }
        TableArea area = TableArea.builder()
                .name(name)
                .note(trimToNull(request.note()))
                .displayOrder(request.displayOrder() == null ? 0 : request.displayOrder())
                .build();
        return tableMapper.toAreaResponse(areaRepository.save(area));
    }

    @Override
    public void deleteArea(String id) {
        TableArea area = areaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.AREA_NOT_FOUND));
        if (tableRepository.existsByArea(area.getName())) {
            throw new ConflictException(ApplicationError.AREA_HAS_TABLES);
        }
        areaRepository.delete(area);
    }

    // ── TM-04 (not yet implemented) ──────────────────────────────────────

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void transfer(TransferTableRequest request) {
        String sourceTableId = request.fromTableId().trim();
        String targetTableId = request.toTableId().trim();
        if (sourceTableId.equals(targetTableId)) {
            throw new ApplicationException(
                    ApplicationError.TABLE_TRANSFER_NOT_ALLOWED,
                    "Source and target tables must be different"
            );
        }

        List<String> tableIds = List.of(sourceTableId, targetTableId).stream()
                .distinct()
                .sorted()
                .toList();

        List<Order> lockedOrders = orderRepository.findActiveByTableIdsForUpdate(
                tableIds,
                TERMINAL_ORDER_STATUSES
        );
        List<String> lockedOrderIds = sortedOrderIds(lockedOrders);

        List<RestaurantTable> lockedTables = tableRepository.findAllByIdInForUpdate(tableIds);
        RestaurantTable sourceTable = findLockedTable(lockedTables, sourceTableId, "Source table not found");
        RestaurantTable targetTable = findLockedTable(lockedTables, targetTableId, "Target table not found");

        List<String> revalidatedOrderIds = sortedDistinctIds(orderRepository.findActiveIdsByTableIds(
                tableIds,
                TERMINAL_ORDER_STATUSES
        ));
        validateDiscoveredOrderIds(lockedOrderIds, revalidatedOrderIds);

        validateTransferTableStates(sourceTable, targetTable);
        Order sourceOrder = validateTransferOrders(lockedOrders, sourceTableId, targetTableId);
        if (invoiceRepository.existsByOrderId(sourceOrder.getId())) {
            throw new ApplicationException(
                    ApplicationError.ORDER_ALREADY_INVOICED,
                    "An invoiced order cannot be transferred to another table"
            );
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime reservationWindowStart = now.minusMinutes(RESERVATION_WINDOW_BEFORE_MINUTES);
        LocalDateTime reservationWindowEnd = now.plusMinutes(RESERVATION_WINDOW_AFTER_MINUTES);
        boolean hasBlockingReservation = !reservationRepository.findBlockingForTablesForUpdate(
                tableIds,
                ReservationStatus.CHECKED_IN,
                SCHEDULED_BLOCKING_RESERVATION_STATUSES,
                reservationWindowStart,
                reservationWindowEnd
        ).isEmpty();
        if (hasBlockingReservation) {
            throw new ConflictException(
                    ApplicationError.TABLE_NOT_AVAILABLE,
                    "Source or target table has a blocking reservation for the current service time"
            );
        }

        sourceOrder.setTableId(targetTableId);
        sourceTable.setStatus(TableStatus.AVAILABLE);
        targetTable.setStatus(TableStatus.OCCUPIED);

        orderRepository.save(sourceOrder);
        tableRepository.saveAll(lockedTables);
    }

    @Override
    public void merge(MergeTableRequest request) { /* TODO TM-04 */ }

    // ── Helpers ──────────────────────────────────────────────────────────

    private RestaurantTable findLockedTable(List<RestaurantTable> lockedTables, String tableId, String message) {
        return lockedTables.stream()
                .filter(table -> table.getId().equals(tableId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.TABLE_NOT_FOUND, message));
    }

    private List<String> sortedOrderIds(List<Order> orders) {
        return orders.stream()
                .map(Order::getId)
                .distinct()
                .sorted()
                .toList();
    }

    private List<String> sortedDistinctIds(List<String> ids) {
        return ids.stream()
                .distinct()
                .sorted()
                .toList();
    }

    private void validateDiscoveredOrderIds(List<String> expectedOrderIds, List<String> currentOrderIds) {
        if (!expectedOrderIds.equals(currentOrderIds)) {
            throw new ApplicationException(
                    ApplicationError.TABLE_TRANSFER_NOT_ALLOWED,
                    "Active order state changed during table transfer"
            );
        }
    }

    private void validateTransferTableStates(RestaurantTable sourceTable, RestaurantTable targetTable) {
        if (!sourceTable.isActive() || !targetTable.isActive()) {
            throw new ApplicationException(
                    ApplicationError.TABLE_TRANSFER_NOT_ALLOWED,
                    "Both source and target tables must be active"
            );
        }
        if (sourceTable.getStatus() != TableStatus.OCCUPIED) {
            throw new ApplicationException(
                    ApplicationError.TABLE_TRANSFER_NOT_ALLOWED,
                    "Source table must be occupied"
            );
        }
        if (targetTable.getStatus() != TableStatus.AVAILABLE) {
            throw new ConflictException(
                    ApplicationError.TABLE_NOT_AVAILABLE,
                    "Target table must be available"
            );
        }
    }

    private Order validateTransferOrders(List<Order> activeOrders, String sourceTableId, String targetTableId) {
        List<Order> sourceOrders = activeOrders.stream()
                .filter(order -> sourceTableId.equals(order.getTableId()))
                .toList();
        if (sourceOrders.size() != 1) {
            throw new ApplicationException(
                    ApplicationError.TABLE_TRANSFER_NOT_ALLOWED,
                    sourceOrders.isEmpty()
                            ? "Source table must have exactly one active order"
                            : "Source table has multiple active orders"
            );
        }

        boolean targetHasActiveOrder = activeOrders.stream()
                .anyMatch(order -> targetTableId.equals(order.getTableId()));
        if (targetHasActiveOrder) {
            throw new ConflictException(
                    ApplicationError.TABLE_IN_USE,
                    "Target table already has an active order"
            );
        }
        return sourceOrders.get(0);
    }

    private RestaurantTable findTable(String id) {
        return tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.TABLE_NOT_FOUND));
    }

    /** The most recent order on this table that hasn't been closed/cancelled, if any. */
    private String findActiveOrderId(String tableId) {
        return orderRepository.findTopByTableIdOrderByCreatedAtDesc(tableId)
                .filter(o -> o.getStatus() != OrderStatus.CLOSED && o.getStatus() != OrderStatus.CANCELLED)
                .map(Order::getId)
                .orElse(null);
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private String column(CSVRecord record, String name) {
        return record.isMapped(name) ? record.get(name) : null;
    }

    /** Blank defaults to true (a newly imported table is in service unless stated otherwise). */
    private boolean parseBoolean(String value) {
        if (!StringUtils.hasText(value)) return true;
        String v = value.trim();
        return v.equalsIgnoreCase("true") || v.equals("1") || v.equalsIgnoreCase("yes");
    }
}
