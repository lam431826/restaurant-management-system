package com.rms.restaurant.module.menu.repository;

import com.rms.restaurant.module.menu.model.MenuItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MenuItemRepository extends JpaRepository<MenuItem, String> {

    List<MenuItem> findByCategoryIdAndAvailableTrue(String categoryId);

    Page<MenuItem> findByCategoryId(String categoryId, Pageable pageable);

    boolean existsByCategoryId(String categoryId);

    long countByCategoryId(String categoryId);

    Optional<MenuItem> findByNameIgnoreCaseAndCategoryId(String name, String categoryId);

    @Query("SELECT i FROM MenuItem i WHERE " +
            "(:categoryId IS NULL OR i.categoryId = :categoryId) AND " +
            "(:available IS NULL OR i.available = :available) AND " +
            "(:q IS NULL OR LOWER(i.name) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<MenuItem> search(@Param("q") String q,
                          @Param("categoryId") String categoryId,
                          @Param("available") Boolean available,
                          Pageable pageable);
}
