package com.rms.restaurant.module.payroll.service.impl;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ConflictException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.payroll.dto.PayrollHolidayRequest;
import com.rms.restaurant.module.payroll.dto.PayrollHolidayResponse;
import com.rms.restaurant.module.payroll.mapper.PayrollMapper;
import com.rms.restaurant.module.payroll.model.PayrollHoliday;
import com.rms.restaurant.module.payroll.repository.PayrollHolidayRepository;
import com.rms.restaurant.module.payroll.service.PayrollHolidayService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PayrollHolidayServiceImpl implements PayrollHolidayService {

    private final PayrollHolidayRepository holidayRepository;
    private final PayrollMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public List<PayrollHolidayResponse> list() {
        return holidayRepository.findAllByOrderByHolidayDateAsc().stream().map(mapper::toResponse).toList();
    }

    @Override
    public PayrollHolidayResponse create(PayrollHolidayRequest request) {
        if (holidayRepository.existsByHolidayDate(request.holidayDate())) {
            throw new ConflictException(ApplicationError.PAYROLL_HOLIDAY_DATE_DUPLICATE);
        }
        PayrollHoliday saved = holidayRepository.save(PayrollHoliday.builder()
                .name(request.name())
                .holidayDate(request.holidayDate())
                .build());
        return mapper.toResponse(saved);
    }

    @Override
    public PayrollHolidayResponse update(String id, PayrollHolidayRequest request) {
        PayrollHoliday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.PAYROLL_HOLIDAY_NOT_FOUND));
        if (holidayRepository.existsByHolidayDateAndIdNot(request.holidayDate(), id)) {
            throw new ConflictException(ApplicationError.PAYROLL_HOLIDAY_DATE_DUPLICATE);
        }
        holiday.setName(request.name());
        holiday.setHolidayDate(request.holidayDate());
        return mapper.toResponse(holidayRepository.save(holiday));
    }

    @Override
    public void delete(String id) {
        if (!holidayRepository.existsById(id)) {
            throw new ResourceNotFoundException(ApplicationError.PAYROLL_HOLIDAY_NOT_FOUND);
        }
        holidayRepository.deleteById(id);
    }
}
