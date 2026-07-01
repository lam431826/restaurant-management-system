package com.rms.restaurant.module.payment.service.impl;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.payment.dto.PaymentResponse;
import com.rms.restaurant.module.payment.dto.PaymentWebhookPayload;
import com.rms.restaurant.module.payment.dto.ProcessPaymentRequest;
import com.rms.restaurant.module.payment.mapper.PaymentMapper;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.Payment;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import com.rms.restaurant.module.payment.service.PaymentService;
import com.rms.restaurant.module.shift.model.Shift;
import com.rms.restaurant.module.shift.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {

    private static final String STATUS_PAID = "PAID";
    private static final String SHIFT_OPEN  = "OPEN";

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentMapper paymentMapper;
    private final UserRepository userRepository;
    private final ShiftRepository shiftRepository;

    @Override
    public PaymentResponse process(ProcessPaymentRequest request, String cashierUsername) {
        // BR-CS-08: a payment must be attributed to the processing cashier's OPEN shift;
        // if they have none, the payment action is blocked.
        User cashier = userRepository.findByUsername(cashierUsername)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.USER_NOT_FOUND));
        Shift shift = shiftRepository.findByCashierIdAndStatus(cashier.getId(), SHIFT_OPEN)
                .orElseThrow(() -> new ApplicationException(ApplicationError.PAYMENT_NO_OPEN_SHIFT));

        Invoice invoice = invoiceRepository.findByIdForUpdate(request.invoiceId())
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));

        if (invoice.isPaid()) {
            throw new ApplicationException(
                    ApplicationError.INVOICE_ALREADY_PAID,
                    "Invoice has already been paid"
            );
        }

        for (Payment existingPayment : paymentRepository.findByInvoiceId(invoice.getId())) {
            if (STATUS_PAID.equals(existingPayment.getStatus())) {
                throw new ApplicationException(
                        ApplicationError.INVOICE_ALREADY_PAID,
                        "A paid payment already exists for this invoice"
                );
            }
        }

        Payment payment = Payment.builder()
                .invoiceId(invoice.getId())
                .method(request.method())
                .amount(invoice.getTotalAmount())
                .status(STATUS_PAID)
                .shiftId(shift.getId())            // BR-CS-08
                .cashierId(cashier.getId())        // BR-CS-08
                .build();

        Payment savedPayment = paymentRepository.save(payment);
        invoice.setPaid(true);
        invoiceRepository.save(invoice);

        return paymentMapper.toResponse(savedPayment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getHistory(String invoiceId) {
        List<Payment> payments;

        if (invoiceId == null || invoiceId.isBlank()) {
            payments = paymentRepository.findAllByOrderByCreatedAtDesc();
        } else {
            payments = paymentRepository.findByInvoiceIdOrderByCreatedAtDesc(invoiceId.trim());
        }

        List<PaymentResponse> responses = new ArrayList<>();
        for (Payment payment : payments) {
            responses.add(paymentMapper.toResponse(payment));
        }
        return responses;
    }

    @Override public void handleWebhook(PaymentWebhookPayload payload, String signature) {}
}
