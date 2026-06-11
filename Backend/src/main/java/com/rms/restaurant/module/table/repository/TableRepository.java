package com.rms.restaurant.module.table.repository;

import com.rms.restaurant.common.utils.enums.TableStatus;
import com.rms.restaurant.module.table.model.RestaurantTable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TableRepository extends JpaRepository<RestaurantTable, String> {
    List<RestaurantTable> findByStatus(TableStatus status);
    Optional<RestaurantTable> findByQrToken(String qrToken);
    boolean existsByName(String name);
}
