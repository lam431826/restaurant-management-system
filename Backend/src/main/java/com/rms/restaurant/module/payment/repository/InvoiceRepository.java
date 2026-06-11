package com.rms.restaurant.module.payment.repository;

import com.rms.restaurant.module.payment.model.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, String> {
    Optional<Invoice> findByOrderId(String orderId);
}
