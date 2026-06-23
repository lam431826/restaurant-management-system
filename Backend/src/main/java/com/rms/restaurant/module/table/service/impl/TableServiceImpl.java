package com.rms.restaurant.module.table.service.impl;

import com.rms.restaurant.module.table.dto.*;
import com.rms.restaurant.module.table.service.TableService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import com.rms.restaurant.module.table.repository.TableRepository;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.common.utils.enums.OrderStatus;

@Service
@RequiredArgsConstructor
@Transactional
public class TableServiceImpl implements TableService {
    private final TableRepository tableRepository;
    private final OrderRepository orderRepository;

    @Override 
    public List<TableResponse> listAll() { 
        return tableRepository.findAll().stream()
                .map(t -> {
                    String activeOrderId = orderRepository.findTopByTableIdOrderByCreatedAtDesc(t.getId())
                            .filter(o -> o.getStatus() != OrderStatus.CLOSED && o.getStatus() != OrderStatus.CANCELLED)
                            .map(Order::getId)
                            .orElse(null);
                    return new TableResponse(t.getId(), t.getName(), t.getCapacity(), "Sảnh chính", t.getStatus(), activeOrderId);
                })
                .toList();
    }
    @Override public TableResponse getById(String id) { return null; }
    @Override public TableResponse updateStatus(String id, TableStatusUpdateRequest request) { return null; }
    @Override public void transfer(TransferTableRequest request) {}
    @Override public void merge(MergeTableRequest request) {}
}
