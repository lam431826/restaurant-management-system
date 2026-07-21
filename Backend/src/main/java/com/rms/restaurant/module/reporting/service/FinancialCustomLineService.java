package com.rms.restaurant.module.reporting.service;

import com.rms.restaurant.module.reporting.dto.FinancialCustomLineDto;
import com.rms.restaurant.module.reporting.dto.FinancialCustomLineRequest;
import com.rms.restaurant.module.reporting.dto.FinancialCustomLineValueRequest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface FinancialCustomLineService {
    List<FinancialCustomLineDto> list();

    FinancialCustomLineDto create(FinancialCustomLineRequest request);

    FinancialCustomLineDto update(String id, FinancialCustomLineRequest request);

    void delete(String id);

    void upsertValue(String lineId, FinancialCustomLineValueRequest request);

    /** lineId -> 12-element array (index 0 = January) of that year's entered amounts,
     * for every existing custom line. Used internally by ReportServiceImpl. */
    Map<String, BigDecimal[]> getValuesForYear(int year);
}
