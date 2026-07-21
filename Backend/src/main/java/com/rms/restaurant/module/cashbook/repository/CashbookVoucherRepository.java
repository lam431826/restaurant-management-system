package com.rms.restaurant.module.cashbook.repository;

import com.rms.restaurant.common.utils.enums.CashFlowMethod;
import com.rms.restaurant.common.utils.enums.CashFlowType;
import com.rms.restaurant.common.utils.enums.CashbookPartnerGroup;
import com.rms.restaurant.module.cashbook.model.CashbookVoucher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CashbookVoucherRepository extends JpaRepository<CashbookVoucher, String> {

    boolean existsByCategoryId(String categoryId);

    /** Callers must always pass a non-empty {@code types} list (default = all types) and,
     * when no category filter applies, {@code hasCategoryFilter=false} with any non-empty
     * {@code categoryIds} placeholder — JPQL cannot bind a null/empty collection to IN. */
    @Query("SELECT v FROM CashbookVoucher v WHERE " +
           "(:search IS NULL OR LOWER(v.code) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(v.note) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:fund IS NULL OR v.method = :fund) AND " +
           "(:from IS NULL OR v.occurredAt >= :from) AND " +
           "(:to IS NULL OR v.occurredAt <= :to) AND " +
           "v.type IN :types AND " +
           "(:hasCategoryFilter = false OR v.categoryId IN :categoryIds) AND " +
           "(:voided IS NULL OR v.voided = :voided) AND " +
           "(:accountingToIncome IS NULL OR v.accountingToIncome = :accountingToIncome) AND " +
           "(:createdBy IS NULL OR v.createdBy = :createdBy) AND " +
           "(:partnerScope IS NULL OR v.partnerGroup = :partnerScope) AND " +
           "(:partnerQuery IS NULL OR LOWER(v.partnerName) LIKE LOWER(CONCAT('%', :partnerQuery, '%')))")
    Page<CashbookVoucher> search(@Param("search") String search,
                                  @Param("fund") CashFlowMethod fund,
                                  @Param("from") LocalDateTime from,
                                  @Param("to") LocalDateTime to,
                                  @Param("types") List<CashFlowType> types,
                                  @Param("hasCategoryFilter") boolean hasCategoryFilter,
                                  @Param("categoryIds") List<String> categoryIds,
                                  @Param("voided") Boolean voided,
                                  @Param("accountingToIncome") Boolean accountingToIncome,
                                  @Param("createdBy") String createdBy,
                                  @Param("partnerScope") CashbookPartnerGroup partnerScope,
                                  @Param("partnerQuery") String partnerQuery,
                                  Pageable pageable);

    /** Same query as {@link #search}, unpaged, for CSV export and summary totals. */
    @Query("SELECT v FROM CashbookVoucher v WHERE " +
           "(:search IS NULL OR LOWER(v.code) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(v.note) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:fund IS NULL OR v.method = :fund) AND " +
           "(:from IS NULL OR v.occurredAt >= :from) AND " +
           "(:to IS NULL OR v.occurredAt <= :to) AND " +
           "v.type IN :types AND " +
           "(:hasCategoryFilter = false OR v.categoryId IN :categoryIds) AND " +
           "(:voided IS NULL OR v.voided = :voided) AND " +
           "(:accountingToIncome IS NULL OR v.accountingToIncome = :accountingToIncome) AND " +
           "(:createdBy IS NULL OR v.createdBy = :createdBy) AND " +
           "(:partnerScope IS NULL OR v.partnerGroup = :partnerScope) AND " +
           "(:partnerQuery IS NULL OR LOWER(v.partnerName) LIKE LOWER(CONCAT('%', :partnerQuery, '%')))")
    List<CashbookVoucher> searchAll(@Param("search") String search,
                                     @Param("fund") CashFlowMethod fund,
                                     @Param("from") LocalDateTime from,
                                     @Param("to") LocalDateTime to,
                                     @Param("types") List<CashFlowType> types,
                                     @Param("hasCategoryFilter") boolean hasCategoryFilter,
                                     @Param("categoryIds") List<String> categoryIds,
                                     @Param("voided") Boolean voided,
                                     @Param("accountingToIncome") Boolean accountingToIncome,
                                     @Param("createdBy") String createdBy,
                                     @Param("partnerScope") CashbookPartnerGroup partnerScope,
                                     @Param("partnerQuery") String partnerQuery);

    @Query("SELECT COALESCE(SUM(v.amount), 0) FROM CashbookVoucher v WHERE v.type = :type AND v.voided = false AND " +
           "(:fund IS NULL OR v.method = :fund) AND " +
           "(:from IS NULL OR v.occurredAt >= :from) AND " +
           "(:to IS NULL OR v.occurredAt <= :to)")
    BigDecimal sumByType(@Param("type") CashFlowType type,
                          @Param("fund") CashFlowMethod fund,
                          @Param("from") LocalDateTime from,
                          @Param("to") LocalDateTime to);

    @Query("SELECT MAX(v.code) FROM CashbookVoucher v WHERE v.code LIKE CONCAT(:prefix, '%')")
    Optional<String> findMaxCode(@Param("prefix") String prefix);
}
