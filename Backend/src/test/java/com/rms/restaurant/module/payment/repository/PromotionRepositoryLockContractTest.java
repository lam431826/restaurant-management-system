package com.rms.restaurant.module.payment.repository;

import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Lock;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

class PromotionRepositoryLockContractTest {

    @Test
    void mutationLookupsRequirePessimisticWriteLocks() throws NoSuchMethodException {
        assertPessimisticWriteLock(
                PromotionRepository.class.getMethod("findByIdForUpdate", String.class));
        assertPessimisticWriteLock(
                PromotionRepository.class.getMethod("findActiveByCodeForUpdate", String.class));
    }

    private void assertPessimisticWriteLock(Method method) {
        Lock lock = method.getAnnotation(Lock.class);
        assertThat(lock)
                .as("%s must retain its database write-lock contract", method.getName())
                .isNotNull();
        assertThat(lock.value()).isEqualTo(LockModeType.PESSIMISTIC_WRITE);
    }
}
