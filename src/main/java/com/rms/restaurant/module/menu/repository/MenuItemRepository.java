package com.rms.restaurant.module.menu.repository;

import com.rms.restaurant.module.menu.model.MenuItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuItemRepository extends JpaRepository<MenuItem, String> {
    List<MenuItem> findByCategoryIdAndAvailableTrue(String categoryId);
    Page<MenuItem> findByCategoryId(String categoryId, Pageable pageable);
}
