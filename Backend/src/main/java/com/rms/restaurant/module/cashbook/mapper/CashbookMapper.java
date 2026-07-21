package com.rms.restaurant.module.cashbook.mapper;

import com.rms.restaurant.module.cashbook.dto.CategoryResponse;
import com.rms.restaurant.module.cashbook.dto.OpeningBalanceItem;
import com.rms.restaurant.module.cashbook.dto.VoucherResponse;
import com.rms.restaurant.module.cashbook.model.CashbookCategory;
import com.rms.restaurant.module.cashbook.model.CashbookOpeningBalance;
import com.rms.restaurant.module.cashbook.model.CashbookVoucher;
import org.springframework.stereotype.Component;

@Component
public class CashbookMapper {

    public CategoryResponse toResponse(CashbookCategory c) {
        return new CategoryResponse(
                c.getId(), c.getCode(), c.getName(), c.getType(),
                c.getDescription(), c.isAccountingToIncome(),
                c.getCreatedAt(), c.getUpdatedAt());
    }

    public VoucherResponse toResponse(CashbookVoucher v, CashbookCategory category) {
        return new VoucherResponse(
                v.getId(), v.getCode(), v.getType(), v.getOccurredAt(),
                v.getCategoryId(), category != null ? category.getName() : null,
                v.getMethod(), v.getPartnerGroup(), v.getPartnerId(), v.getPartnerName(),
                v.getAmount(), v.getNote(), v.isAccountingToIncome(),
                v.getSourceType(), v.getSourceReferenceId(), v.getCreatedBy(),
                v.isVoided(), v.getCreatedAt());
    }

    public OpeningBalanceItem toResponse(CashbookOpeningBalance b) {
        return new OpeningBalanceItem(b.getMethod(), b.getAmount(), b.getUpdatedBy(), b.getUpdatedAt());
    }
}
