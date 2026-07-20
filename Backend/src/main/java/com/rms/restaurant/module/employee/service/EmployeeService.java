package com.rms.restaurant.module.employee.service;

import com.rms.restaurant.common.utils.enums.EmployeeStatus;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.employee.dto.*;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface EmployeeService {

    PageResponse<EmployeeResponse> list(String code, String name, String phone, EmployeeStatus status, Pageable pageable);

    EmployeeResponse get(String id);

    EmployeeResponse create(CreateEmployeeRequest request);

    EmployeeResponse update(String id, UpdateEmployeeRequest request);

    void deactivate(String id);

    /** Self-service: the current user's own linked Employee, or a starter view pre-filled from their User row if none exists yet. */
    EmployeeResponse getMyProfile(String username);

    /** Self-service: create-or-update the current user's own Employee profile, keeping name/phone/email in sync with their User row. */
    EmployeeResponse saveMyProfile(String username, SelfEmployeeProfileRequest request);

    SalarySettingResponse getSalarySetting(String employeeId);

    SalarySettingResponse upsertSalarySetting(String employeeId, SalarySettingRequest request);

    byte[] exportCsv(String code, String name, String phone, EmployeeStatus status, List<String> ids);

    EmployeeImportResultResponse importCsv(MultipartFile file, ImportStrategy strategy);
}
