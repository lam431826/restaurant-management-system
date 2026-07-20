package com.rms.restaurant.module.order.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/**
 * Customer contact a cashier enters for a walk-in / table order. Every field is optional
 * so the cashier can supply only what the guest gives; a blank value clears the field.
 */
public record UpdateOrderCustomerRequest(
        @Size(max = 150) String customerName,
        @Size(max = 20) String customerPhone,
        @Email @Size(max = 150) String customerEmail
) {}
