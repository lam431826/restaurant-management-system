package com.rms.restaurant.module.reporting.service.impl;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.reporting.dto.FinancialCustomLineDto;
import com.rms.restaurant.module.reporting.dto.FinancialCustomLineRequest;
import com.rms.restaurant.module.reporting.dto.FinancialCustomLineValueRequest;
import com.rms.restaurant.module.reporting.model.FinancialCustomLine;
import com.rms.restaurant.module.reporting.model.FinancialCustomLineValue;
import com.rms.restaurant.module.reporting.repository.FinancialCustomLineRepository;
import com.rms.restaurant.module.reporting.repository.FinancialCustomLineValueRepository;
import com.rms.restaurant.module.reporting.service.FinancialCustomLineService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class FinancialCustomLineServiceImpl implements FinancialCustomLineService {

    private final FinancialCustomLineRepository lineRepository;
    private final FinancialCustomLineValueRepository valueRepository;

    @Override
    @Transactional(readOnly = true)
    public List<FinancialCustomLineDto> list() {
        return lineRepository.findAllByOrderByGroupTypeAscSortOrderAsc().stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public FinancialCustomLineDto create(FinancialCustomLineRequest request) {
        String name = request.name().trim();
        if (name.isEmpty()) {
            throw new ApplicationException(ApplicationError.FIN_CUSTOM_LINE_INVALID);
        }
        int nextSortOrder = lineRepository.countByGroupType(request.group());
        FinancialCustomLine line = FinancialCustomLine.builder()
                .groupType(request.group())
                .name(name)
                .sortOrder(nextSortOrder)
                .build();
        return toDto(lineRepository.save(line));
    }

    @Override
    public FinancialCustomLineDto update(String id, FinancialCustomLineRequest request) {
        String name = request.name().trim();
        if (name.isEmpty()) {
            throw new ApplicationException(ApplicationError.FIN_CUSTOM_LINE_INVALID);
        }
        FinancialCustomLine line = current(id);
        line.setName(name);
        return toDto(lineRepository.save(line));
    }

    @Override
    public void delete(String id) {
        FinancialCustomLine line = current(id);
        lineRepository.delete(line);
    }

    @Override
    public void upsertValue(String lineId, FinancialCustomLineValueRequest request) {
        current(lineId); // 404s if the line doesn't exist
        FinancialCustomLineValue value = valueRepository
                .findByCustomLineIdAndYearAndMonth(lineId, request.year(), request.month())
                .orElseGet(() -> FinancialCustomLineValue.builder()
                        .customLineId(lineId)
                        .year(request.year())
                        .month(request.month())
                        .build());
        value.setAmount(request.amount() == null ? BigDecimal.ZERO : request.amount());
        valueRepository.save(value);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, BigDecimal[]> getValuesForYear(int year) {
        List<String> lineIds = lineRepository.findAllByOrderByGroupTypeAscSortOrderAsc().stream()
                .map(FinancialCustomLine::getId)
                .toList();
        Map<String, BigDecimal[]> result = new HashMap<>();
        for (String lineId : lineIds) {
            BigDecimal[] months = new BigDecimal[12];
            java.util.Arrays.fill(months, BigDecimal.ZERO);
            result.put(lineId, months);
        }
        if (lineIds.isEmpty()) return result;

        for (FinancialCustomLineValue v : valueRepository.findByCustomLineIdInAndYear(lineIds, year)) {
            result.get(v.getCustomLineId())[v.getMonth() - 1] = v.getAmount();
        }
        return result;
    }

    private FinancialCustomLine current(String id) {
        return lineRepository.findById(id)
                .orElseThrow(() -> new ApplicationException(ApplicationError.FIN_CUSTOM_LINE_NOT_FOUND));
    }

    private FinancialCustomLineDto toDto(FinancialCustomLine line) {
        return new FinancialCustomLineDto(line.getId(), line.getGroupType(), line.getName(), line.getSortOrder());
    }
}
