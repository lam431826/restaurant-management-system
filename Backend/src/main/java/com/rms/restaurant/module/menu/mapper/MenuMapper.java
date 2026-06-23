package com.rms.restaurant.module.menu.mapper;

import com.rms.restaurant.module.menu.dto.CategoryResponse;
import com.rms.restaurant.module.menu.dto.MenuItemResponse;
import com.rms.restaurant.module.menu.dto.PublicMenuItemResponse;
import com.rms.restaurant.module.menu.model.MenuCategory;
import com.rms.restaurant.module.menu.model.MenuItem;
import org.springframework.stereotype.Component;

@Component
public class MenuMapper {

    public MenuItemResponse toResponse(MenuItem item) {
        return new MenuItemResponse(
                item.getId(),
                item.getCode(),
                item.getCategoryId(),
                item.getName(),
                item.getPrice(),
                item.getCostPrice(),
                item.getDescription(),
                item.getImageUrl(),
                item.getMenuType(),
                item.getItemType(),
                item.getTag(),
                item.isTrackStock(),
                item.isAvailable()
        );
    }

    public PublicMenuItemResponse toPublicResponse(MenuItem item) {
        return new PublicMenuItemResponse(
                item.getId(),
                item.getCategoryId(),
                item.getName(),
                item.getPrice(),
                item.getDescription(),
                item.getImageUrl()
        );
    }

    public CategoryResponse toCategoryResponse(MenuCategory category, long itemCount) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getDisplayOrder(),
                category.getIcon(),
                itemCount
        );
    }
}
