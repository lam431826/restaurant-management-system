package com.rms.restaurant.module.payroll.service;

import com.rms.restaurant.module.payroll.dto.PayrollHolidayRequest;
import com.rms.restaurant.module.payroll.dto.PayrollHolidayResponse;

import java.util.List;

public interface PayrollHolidayService {

    List<PayrollHolidayResponse> list();

    PayrollHolidayResponse create(PayrollHolidayRequest request);

    PayrollHolidayResponse update(String id, PayrollHolidayRequest request);

    void delete(String id);
}
