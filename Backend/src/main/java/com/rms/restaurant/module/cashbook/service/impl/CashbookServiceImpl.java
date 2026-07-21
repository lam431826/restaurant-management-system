package com.rms.restaurant.module.cashbook.service.impl;

import com.rms.restaurant.common.utils.enums.CashFlowMethod;
import com.rms.restaurant.common.utils.enums.CashFlowType;
import com.rms.restaurant.common.utils.enums.CashbookPartnerGroup;
import com.rms.restaurant.common.utils.enums.CashbookSourceType;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.cashbook.dto.*;
import com.rms.restaurant.module.cashbook.mapper.CashbookMapper;
import com.rms.restaurant.module.cashbook.model.CashbookCategory;
import com.rms.restaurant.module.cashbook.model.CashbookOpeningBalance;
import com.rms.restaurant.module.cashbook.model.CashbookVoucher;
import com.rms.restaurant.module.cashbook.repository.CashbookCategoryRepository;
import com.rms.restaurant.module.cashbook.repository.CashbookOpeningBalanceRepository;
import com.rms.restaurant.module.cashbook.repository.CashbookVoucherRepository;
import com.rms.restaurant.module.cashbook.service.CashbookService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CashbookServiceImpl implements CashbookService {

    private final CashbookCategoryRepository categoryRepository;
    private final CashbookVoucherRepository voucherRepository;
    private final CashbookOpeningBalanceRepository openingBalanceRepository;
    private final CashbookMapper mapper;

    // ── Categories ───────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> listCategories() {
        return categoryRepository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Override
    public CategoryResponse createCategory(CategoryRequest request) {
        if (categoryRepository.existsByNameIgnoreCase(request.name())) {
            throw new ApplicationException(ApplicationError.DUPLICATE_CASHBOOK_CATEGORY_NAME);
        }
        CashbookCategory saved = categoryRepository.save(CashbookCategory.builder()
                .name(request.name())
                .type(request.type())
                .description(trimToNull(request.description()))
                .accountingToIncome(request.accountingToIncome())
                .build());
        return mapper.toResponse(saved);
    }

    @Override
    public CategoryResponse updateCategory(String id, CategoryRequest request) {
        CashbookCategory category = requireCategory(id);
        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(request.name(), id)) {
            throw new ApplicationException(ApplicationError.DUPLICATE_CASHBOOK_CATEGORY_NAME);
        }
        category.setName(request.name());
        category.setType(request.type());
        category.setDescription(trimToNull(request.description()));
        category.setAccountingToIncome(request.accountingToIncome());
        return mapper.toResponse(categoryRepository.save(category));
    }

    @Override
    public void deleteCategory(String id) {
        CashbookCategory category = requireCategory(id);
        if (category.getCode() != null) {
            throw new ApplicationException(ApplicationError.CASHBOOK_CATEGORY_SYSTEM_RESERVED);
        }
        if (voucherRepository.existsByCategoryId(id)) {
            throw new ApplicationException(ApplicationError.CASHBOOK_CATEGORY_IN_USE);
        }
        categoryRepository.delete(category);
    }

    // ── Vouchers ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PageResponse<VoucherResponse> listVouchers(VoucherFilter filter, Pageable pageable) {
        EffectiveFilter ef = resolve(filter);
        Page<CashbookVoucher> page = voucherRepository.search(
                ef.search, filter.fund(), filter.from(), filter.to(), ef.types,
                ef.hasCategoryFilter, ef.categoryIds, filter.voided(), filter.accountingToIncome(),
                filter.createdBy(), filter.partnerScope(), ef.partnerQuery, pageable);
        Map<String, CashbookCategory> categories = categoriesById(page.getContent());
        return PageResponse.of(page.map(v -> mapper.toResponse(v, categories.get(v.getCategoryId()))));
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoucherResponse> listVouchersUnpaged(VoucherFilter filter) {
        EffectiveFilter ef = resolve(filter);
        List<CashbookVoucher> vouchers = voucherRepository.searchAll(
                ef.search, filter.fund(), filter.from(), filter.to(), ef.types,
                ef.hasCategoryFilter, ef.categoryIds, filter.voided(), filter.accountingToIncome(),
                filter.createdBy(), filter.partnerScope(), ef.partnerQuery);
        Map<String, CashbookCategory> categories = categoriesById(vouchers);
        return vouchers.stream().map(v -> mapper.toResponse(v, categories.get(v.getCategoryId()))).toList();
    }

    @Override
    public VoucherResponse createVoucher(CreateVoucherRequest request, String username) {
        CashbookCategory category = requireCategory(request.categoryId());
        if (category.getType() != request.type()) {
            throw new ApplicationException(ApplicationError.CASHBOOK_VOUCHER_CATEGORY_TYPE_MISMATCH);
        }
        validateManualPartner(request.partnerGroup(), request.partnerId());

        CashbookVoucher voucher = voucherRepository.save(CashbookVoucher.builder()
                .code(nextVoucherCode(request.type(), CashbookSourceType.MANUAL))
                .type(request.type())
                .occurredAt(request.occurredAt())
                .categoryId(category.getId())
                .method(request.method())
                .partnerGroup(request.partnerGroup())
                .partnerId(request.partnerGroup() == CashbookPartnerGroup.EMPLOYEE ? request.partnerId() : null)
                .partnerName(request.partnerName())
                .amount(request.amount())
                .note(trimToNull(request.note()))
                .accountingToIncome(request.accountingToIncome())
                .sourceType(CashbookSourceType.MANUAL)
                .createdBy(username)
                .voided(false)
                .build());
        return mapper.toResponse(voucher, category);
    }

    private void validateManualPartner(CashbookPartnerGroup group, String partnerId) {
        if (group == CashbookPartnerGroup.CUSTOMER) {
            throw new ApplicationException(ApplicationError.CASHBOOK_VOUCHER_PARTNER_GROUP_INVALID,
                    "CUSTOMER partner group is reserved for system-generated vouchers");
        }
        if (group == CashbookPartnerGroup.EMPLOYEE && (partnerId == null || partnerId.isBlank())) {
            throw new ApplicationException(ApplicationError.CASHBOOK_VOUCHER_PARTNER_GROUP_INVALID,
                    "partnerId is required when partnerGroup is EMPLOYEE");
        }
    }

    @Override
    public VoucherResponse voidVoucher(String id) {
        CashbookVoucher voucher = requireVoucher(id);
        if (voucher.isVoided()) {
            throw new ApplicationException(ApplicationError.CASHBOOK_VOUCHER_ALREADY_VOIDED);
        }
        voucher.setVoided(true);
        voucherRepository.save(voucher);
        return mapper.toResponse(voucher, categoryRepository.findById(voucher.getCategoryId()).orElse(null));
    }

    @Override
    public VoucherResponse createSystemVoucher(SystemVoucherRequest request) {
        CashbookCategory category = categoryRepository.findByCode(request.categoryCode())
                .orElseThrow(() -> new ApplicationException(ApplicationError.CASHBOOK_CATEGORY_NOT_FOUND,
                        "System category not seeded: " + request.categoryCode()));

        CashbookVoucher voucher = voucherRepository.save(CashbookVoucher.builder()
                .code(nextVoucherCode(request.type(), request.sourceType()))
                .type(request.type())
                .occurredAt(request.occurredAt() != null ? request.occurredAt() : LocalDateTime.now())
                .categoryId(category.getId())
                .method(request.method())
                .partnerGroup(request.partnerGroup())
                .partnerId(request.partnerId())
                .partnerName(request.partnerName())
                .amount(request.amount())
                .note(trimToNull(request.note()))
                .accountingToIncome(request.accountingToIncome())
                .sourceType(request.sourceType())
                .sourceReferenceId(request.sourceReferenceId())
                .createdBy(request.createdBy())
                .voided(false)
                .build());
        return mapper.toResponse(voucher, category);
    }

    // ── Summary / opening balance ───────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public SummaryResponse getSummary(VoucherFilter filter) {
        BigDecimal opening = openingBalance(filter.fund());
        BigDecimal income = voucherRepository.sumByType(CashFlowType.RECEIPT, filter.fund(), filter.from(), filter.to());
        BigDecimal expense = voucherRepository.sumByType(CashFlowType.PAYMENT, filter.fund(), filter.from(), filter.to());
        return new SummaryResponse(opening, income, expense, opening.add(income).subtract(expense));
    }

    private BigDecimal openingBalance(CashFlowMethod fund) {
        return openingBalanceRepository.findAll().stream()
                .filter(b -> fund == null || b.getMethod() == fund)
                .map(CashbookOpeningBalance::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OpeningBalanceItem> getOpeningBalances() {
        return openingBalanceRepository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Override
    public void updateOpeningBalance(UpdateOpeningBalanceRequest request, String username) {
        CashbookOpeningBalance balance = openingBalanceRepository.findById(request.method())
                .orElse(CashbookOpeningBalance.builder().method(request.method()).build());
        balance.setAmount(request.amount());
        balance.setUpdatedBy(username);
        openingBalanceRepository.save(balance);
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private record EffectiveFilter(String search, List<CashFlowType> types, boolean hasCategoryFilter,
                                    List<String> categoryIds, String partnerQuery) {}

    /** JPQL cannot bind a null/empty collection to IN — always pass a non-empty types list
     * (default = all types) and, when no category filter applies, a placeholder categoryIds
     * list gated off by hasCategoryFilter=false. Same convention as PayrollSheetRepository. */
    private EffectiveFilter resolve(VoucherFilter filter) {
        List<CashFlowType> types = (filter.types() == null || filter.types().isEmpty())
                ? List.of(CashFlowType.values()) : filter.types();
        boolean hasCategoryFilter = filter.categoryIds() != null && !filter.categoryIds().isEmpty();
        List<String> categoryIds = hasCategoryFilter ? filter.categoryIds() : List.of("__none__");
        return new EffectiveFilter(trimToNull(filter.search()), types, hasCategoryFilter, categoryIds,
                trimToNull(filter.partnerQuery()));
    }

    private Map<String, CashbookCategory> categoriesById(List<CashbookVoucher> vouchers) {
        if (vouchers.isEmpty()) return Map.of();
        List<String> ids = vouchers.stream().map(CashbookVoucher::getCategoryId).distinct().toList();
        return categoryRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(CashbookCategory::getId, Function.identity()));
    }

    private String nextVoucherCode(CashFlowType type, CashbookSourceType sourceType) {
        String prefix = sourceType == CashbookSourceType.INVOICE_PAYMENT ? "TT"
                : type == CashFlowType.RECEIPT ? "PT" : "PC";
        long next = numericSuffix(voucherRepository.findMaxCode(prefix).orElse(null)) + 1;
        return prefix + String.format("%06d", next);
    }

    private long numericSuffix(String code) {
        if (code == null) return 0;
        String digits = code.replaceAll("\\D", "");
        return digits.isEmpty() ? 0 : Long.parseLong(digits);
    }

    private CashbookCategory requireCategory(String id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ApplicationException(ApplicationError.CASHBOOK_CATEGORY_NOT_FOUND));
    }

    private CashbookVoucher requireVoucher(String id) {
        return voucherRepository.findById(id)
                .orElseThrow(() -> new ApplicationException(ApplicationError.CASHBOOK_VOUCHER_NOT_FOUND));
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
