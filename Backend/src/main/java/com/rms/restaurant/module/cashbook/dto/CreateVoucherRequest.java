package com.rms.restaurant.module.cashbook.dto;

import com.rms.restaurant.common.utils.enums.CashFlowMethod;
import com.rms.restaurant.common.utils.enums.CashFlowType;
import com.rms.restaurant.common.utils.enums.CashbookPartnerGroup;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Manual voucher creation (CashFlowModal). {@code partnerGroup} must be EMPLOYEE or OTHER —
 * CUSTOMER is reserved for {@code createSystemVoucher} invoice-payment receipts. */
public record CreateVoucherRequest(
        @NotNull CashFlowType type,
        @NotNull LocalDateTime occurredAt,
        @NotBlank String categoryId,
        @NotNull CashFlowMethod method,
        @NotNull CashbookPartnerGroup partnerGroup,
        String partnerId,
        @NotBlank @Size(max = 200) String partnerName,
        @NotNull @Positive BigDecimal amount,
        @Size(max = 500) String note,
        boolean accountingToIncome
) {}
