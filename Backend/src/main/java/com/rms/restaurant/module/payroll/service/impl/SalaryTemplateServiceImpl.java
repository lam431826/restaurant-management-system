package com.rms.restaurant.module.payroll.service.impl;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ConflictException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.payroll.dto.SalaryTemplateRequest;
import com.rms.restaurant.module.payroll.dto.SalaryTemplateResponse;
import com.rms.restaurant.module.payroll.mapper.PayrollMapper;
import com.rms.restaurant.module.payroll.model.SalaryTemplate;
import com.rms.restaurant.module.payroll.repository.SalaryTemplateRepository;
import com.rms.restaurant.module.payroll.service.SalaryTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class SalaryTemplateServiceImpl implements SalaryTemplateService {

    private final SalaryTemplateRepository templateRepo;
    private final PayrollMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public List<SalaryTemplateResponse> list() {
        return templateRepo.findAllByOrderByNameAsc().stream().map(mapper::toResponse).toList();
    }

    @Override
    public SalaryTemplateResponse create(SalaryTemplateRequest request) {
        if (templateRepo.existsByNameIgnoreCase(request.name())) {
            throw new ConflictException(ApplicationError.SALARY_TEMPLATE_NAME_DUPLICATE);
        }
        SalaryTemplate saved = templateRepo.save(SalaryTemplate.builder()
                .name(request.name())
                .mainSalaryType(request.mainSalaryType())
                .mainBaseWage(request.mainBaseWage())
                .mainAdvancedRates(request.mainAdvancedRatesJson())
                .overtimeEnabled(request.overtimeEnabled())
                .overtimeRates(request.overtimeRatesJson())
                .build());
        return mapper.toResponse(saved);
    }

    @Override
    public SalaryTemplateResponse update(String id, SalaryTemplateRequest request) {
        SalaryTemplate template = templateRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.SALARY_TEMPLATE_NOT_FOUND));
        if (templateRepo.existsByNameIgnoreCaseAndIdNot(request.name(), id)) {
            throw new ConflictException(ApplicationError.SALARY_TEMPLATE_NAME_DUPLICATE);
        }
        template.setName(request.name());
        template.setMainSalaryType(request.mainSalaryType());
        template.setMainBaseWage(request.mainBaseWage());
        template.setMainAdvancedRates(request.mainAdvancedRatesJson());
        template.setOvertimeEnabled(request.overtimeEnabled());
        template.setOvertimeRates(request.overtimeRatesJson());
        return mapper.toResponse(templateRepo.save(template));
    }

    @Override
    public void delete(String id) {
        if (!templateRepo.existsById(id)) {
            throw new ResourceNotFoundException(ApplicationError.SALARY_TEMPLATE_NOT_FOUND);
        }
        templateRepo.deleteById(id);
    }
}
