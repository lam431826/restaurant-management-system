package com.rms.restaurant.common.utils.enums;

/**
 * BR-PAY-16. Deliberately separate from the invoice {@link PaymentMethod} — salary payouts
 * and customer payments evolve independently.
 */
public enum SalaryPaymentMethod {
    CASH,
    TRANSFER
}
