package com.rms.restaurant.module.employee.mapper;

import com.rms.restaurant.module.employee.dto.EmployeeResponse;
import com.rms.restaurant.module.employee.dto.SalarySettingResponse;
import com.rms.restaurant.module.employee.model.Employee;
import com.rms.restaurant.module.employee.model.SalarySetting;
import org.springframework.stereotype.Component;

@Component
public class EmployeeMapper {

    public EmployeeResponse toResponse(Employee employee) {
        return new EmployeeResponse(
                employee.getId(),
                employee.getCode(),
                employee.getName(),
                employee.getPhone(),
                employee.getStatus(),
                employee.getAvatarUrl(),
                employee.getStartDate(),
                employee.getTimekeepCode(),
                employee.getNote(),
                employee.getIdNumber(),
                employee.getBirthday(),
                employee.getGender(),
                employee.getAddress(),
                employee.getEmail(),
                employee.getUserId(),
                employee.getCreatedAt(),
                employee.getUpdatedAt()
        );
    }

    public SalarySettingResponse toResponse(SalarySetting setting) {
        return new SalarySettingResponse(
                setting.getId(),
                setting.getEmployeeId(),
                setting.getMainSalaryType(),
                setting.getMainBaseWage(),
                setting.getMainAdvancedRates(),
                setting.isOvertimeEnabled(),
                setting.getOvertimeRates(),
                setting.getSalaryTemplate()
        );
    }
}
