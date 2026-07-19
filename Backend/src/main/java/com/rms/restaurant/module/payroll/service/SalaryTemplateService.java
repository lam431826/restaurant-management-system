package com.rms.restaurant.module.payroll.service;

import com.rms.restaurant.module.payroll.dto.SalaryTemplateRequest;
import com.rms.restaurant.module.payroll.dto.SalaryTemplateResponse;

import java.util.List;

public interface SalaryTemplateService {

    List<SalaryTemplateResponse> list();

    SalaryTemplateResponse create(SalaryTemplateRequest request);

    SalaryTemplateResponse update(String id, SalaryTemplateRequest request);

    void delete(String id);
}
