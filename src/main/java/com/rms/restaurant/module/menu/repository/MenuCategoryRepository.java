package com.rms.restaurant.module.menu.repository;

import com.rms.restaurant.module.menu.model.MenuCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuCategoryRepository extends JpaRepository<MenuCategory, String> {
    List<MenuCategory> findAllByOrderByDisplayOrderAsc();
}
