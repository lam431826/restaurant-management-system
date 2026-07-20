package com.rms.restaurant.module.payment.service.internal;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.payment.dto.MergeInvoiceRequest;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class InvoiceMergeValidator {

    private static final int MIN_SOURCE_COUNT = 2;
    private static final int MAX_SOURCE_COUNT = 100;

    private final InvoiceRepository invoiceRepository;

    @Transactional(readOnly = true)
    public ValidatedInvoiceMergePlan validate(MergeInvoiceRequest request) {
        List<String> sourceInvoiceIds = normalizeSourceInvoiceIds(request);
        List<InvoiceRepository.InvoiceOrderProjection> projections =
                invoiceRepository.findOrderIdsByIds(sourceInvoiceIds);

        Map<String, String> orderIdByInvoiceId = new LinkedHashMap<>();
        for (InvoiceRepository.InvoiceOrderProjection projection : projections) {
            if (projection == null
                    || projection.getId() == null
                    || projection.getId().isBlank()
                    || projection.getOrderId() == null
                    || projection.getOrderId().isBlank()
                    || orderIdByInvoiceId.put(projection.getId(), projection.getOrderId()) != null) {
                throw invalidAllocationData();
            }
        }

        if (orderIdByInvoiceId.size() != sourceInvoiceIds.size()
                || !orderIdByInvoiceId.keySet().containsAll(sourceInvoiceIds)) {
            throw new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND);
        }

        Set<String> orderIds = new LinkedHashSet<>(orderIdByInvoiceId.values());
        if (orderIds.size() != 1) {
            throw new ApplicationException(ApplicationError.INVOICE_MERGE_ORDER_MISMATCH);
        }

        return new ValidatedInvoiceMergePlan(orderIds.iterator().next(), sourceInvoiceIds);
    }

    private List<String> normalizeSourceInvoiceIds(MergeInvoiceRequest request) {
        if (request == null
                || request.invoiceIds() == null
                || request.invoiceIds().size() < MIN_SOURCE_COUNT
                || request.invoiceIds().size() > MAX_SOURCE_COUNT) {
            throw invalidMerge();
        }

        Set<String> normalizedIds = new LinkedHashSet<>();
        for (String invoiceId : request.invoiceIds()) {
            if (invoiceId == null || invoiceId.isBlank()) {
                throw invalidMerge();
            }
            if (!normalizedIds.add(invoiceId.trim())) {
                throw invalidMerge();
            }
        }

        List<String> canonicalIds = new ArrayList<>(normalizedIds);
        canonicalIds.sort(String::compareTo);
        return List.copyOf(canonicalIds);
    }

    private ApplicationException invalidMerge() {
        return new ApplicationException(ApplicationError.INVALID_INVOICE_MERGE);
    }

    private ApplicationException invalidAllocationData() {
        return new ApplicationException(ApplicationError.INVOICE_ALLOCATION_DATA_INVALID);
    }
}
