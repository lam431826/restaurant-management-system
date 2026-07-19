package com.rms.restaurant.module.order.repository;

import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.module.order.model.Order;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") String id);

    @Query("SELECT o.id FROM Order o " +
           "WHERE o.tableId IN :tableIds AND o.status NOT IN :terminalStatuses " +
           "ORDER BY o.id ASC")
    List<String> findActiveIdsByTableIds(
            @Param("tableIds") List<String> tableIds,
            @Param("terminalStatuses") Collection<OrderStatus> terminalStatuses
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o " +
           "WHERE o.tableId IN :tableIds AND o.status NOT IN :terminalStatuses " +
           "ORDER BY o.id ASC")
    List<Order> findActiveByTableIdsForUpdate(
            @Param("tableIds") List<String> tableIds,
            @Param("terminalStatuses") Collection<OrderStatus> terminalStatuses
    );

    List<Order> findByTableIdAndStatus(String tableId, OrderStatus status);
    Optional<Order> findTopByTableIdOrderByCreatedAtDesc(String tableId);
    Optional<Order> findTopByTableIdAndStatusNotInOrderByCreatedAtDesc(
            String tableId,
            Collection<OrderStatus> terminalStatuses
    );
    Optional<Order> findTopByTableIdAndStatusOrderByCreatedAtDesc(String tableId, OrderStatus status);
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    // BE-TBL-05: guard deleteTable() with a clean error instead of a raw FK-constraint 500
    boolean existsByTableId(String tableId);

    // BR-CLOSE-06: shift cannot close when active orders exist
    boolean existsByStatusIn(Collection<OrderStatus> statuses);
}
