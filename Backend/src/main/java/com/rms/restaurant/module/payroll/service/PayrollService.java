package com.rms.restaurant.module.payroll.service;

import com.rms.restaurant.common.utils.enums.PayrollSheetStatus;
import com.rms.restaurant.common.utils.enums.PayrollTerm;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.payroll.dto.*;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface PayrollService {

    PageResponse<PayrollSheetResponse> listSheets(String search, PayrollTerm term,
                                                  List<PayrollSheetStatus> statuses, Pageable pageable);

    PayrollSheetResponse createSheet(CreatePayrollSheetRequest request, String username);

    PayrollSheetResponse getSheet(String sheetId);

    List<PayslipRowResponse> listPayslips(String sheetId);

    void saveDraft(String sheetId, SaveDraftRequest request);

    PayrollSheetResponse reload(String sheetId, ReloadRequest.ReloadMode mode);

    PayrollSheetResponse finalizeSheet(String sheetId, String username);

    void cancelSheet(String sheetId);

    List<PaymentResponse> pay(String sheetId, PayRequest request, String username);

    List<PaymentResponse> listPayments(String sheetId);

    PayslipDetailResponse getPayslip(String payslipId);

    void cancelPayslip(String payslipId);

    List<PayslipDetailResponse> listEmployeePayslips(String employeeId);
}
