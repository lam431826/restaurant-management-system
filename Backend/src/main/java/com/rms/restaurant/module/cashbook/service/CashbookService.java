package com.rms.restaurant.module.cashbook.service;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.cashbook.dto.*;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public interface CashbookService {

    List<CategoryResponse> listCategories();

    CategoryResponse createCategory(CategoryRequest request);

    CategoryResponse updateCategory(String id, CategoryRequest request);

    void deleteCategory(String id);

    PageResponse<VoucherResponse> listVouchers(VoucherFilter filter, Pageable pageable);

    List<VoucherResponse> listVouchersUnpaged(VoucherFilter filter);

    VoucherResponse createVoucher(CreateVoucherRequest request, String username);

    /** Only vouchers with {@code sourceType == MANUAL} may be edited — vouchers auto-generated
     * by Payroll/Payment integrations are read-only here since they mirror domain state owned
     * elsewhere. */
    VoucherResponse updateVoucher(String id, CreateVoucherRequest request);

    VoucherResponse voidVoucher(String id);

    SummaryResponse getSummary(VoucherFilter filter);

    List<OpeningBalanceItem> getOpeningBalances();

    void updateOpeningBalance(UpdateOpeningBalanceRequest request, String username);

    /** Integration entry point for payroll/payment modules — see {@link SystemVoucherRequest}. */
    VoucherResponse createSystemVoucher(SystemVoucherRequest request);
}
