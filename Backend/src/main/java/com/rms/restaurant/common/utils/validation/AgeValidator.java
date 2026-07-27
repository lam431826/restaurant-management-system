package com.rms.restaurant.common.utils.validation;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;

import java.time.LocalDate;
import java.time.Period;

/**
 * BR: an employee's birthday must put them between 18 and 60 years old (inclusive). Shared
 * across every place a birthday is submitted — first-login verify/info, self-service "Hồ sơ
 * của tôi", and manager-side employee create/update — so the rule can't drift between them.
 */
public final class AgeValidator {

    private static final int MIN_AGE = 18;
    private static final int MAX_AGE = 60;

    private AgeValidator() {}

    /** No-op when birthday is null — the field is optional everywhere it's collected. */
    public static void validateEmployeeAge(LocalDate birthday) {
        if (birthday == null) return;
        int age = Period.between(birthday, LocalDate.now()).getYears();
        if (age < MIN_AGE || age > MAX_AGE) {
            throw new ApplicationException(ApplicationError.EMPLOYEE_AGE_OUT_OF_RANGE);
        }
    }
}
