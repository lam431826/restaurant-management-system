package com.rms.restaurant.module.table.repository;

import com.rms.restaurant.common.utils.enums.TableStatus;
import com.rms.restaurant.module.table.model.RestaurantTable;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TableRepository extends JpaRepository<RestaurantTable, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM RestaurantTable t WHERE t.id IN :ids ORDER BY t.id ASC")
    List<RestaurantTable> findAllByIdInForUpdate(@Param("ids") List<String> ids);

    List<RestaurantTable> findByStatus(TableStatus status);
    List<RestaurantTable> findAllByOrderByAreaAscNameAsc();
    Optional<RestaurantTable> findByQrToken(String qrToken);
    boolean existsByName(String name);
    boolean existsByNameAndIdNot(String name, String id);
    long countByCapacityGreaterThanEqual(int capacity);

    /** Returns IDs of tables whose capacity falls in [min, max] — used for tier-based availability. */
    @Query("SELECT t.id FROM RestaurantTable t WHERE t.capacity >= :min AND t.capacity <= :max")
    List<String> findIdsByCapacityBetween(@Param("min") int min, @Param("max") int max);
    List<RestaurantTable> findAllByOrderByDisplayOrderAscNameAsc();
    boolean existsByNameIgnoreCase(String name);
    boolean existsByArea(String area);
    Optional<RestaurantTable> findByNameIgnoreCase(String name);

    @Query("SELECT t FROM RestaurantTable t WHERE " +
            "(:area IS NULL OR t.area = :area) AND " +
            "(:active IS NULL OR t.active = :active) AND " +
            "(:q IS NULL OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%')) OR t.capacity = :qAsCapacity)")
    Page<RestaurantTable> search(@Param("q") String q,
                                 @Param("qAsCapacity") Integer qAsCapacity,
                                 @Param("area") String area,
                                 @Param("active") Boolean active,
                                 Pageable pageable);
}
