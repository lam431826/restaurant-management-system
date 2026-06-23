package com.rms.restaurant.module.menu.service;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.menu.dto.*;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface MenuService {

    // Items (MM-01 / MM-03)
    PageResponse<MenuItemResponse> searchItems(String q, String categoryId, Boolean available, Pageable pageable);
    MenuItemResponse getItem(String id);
    MenuItemResponse createItem(CreateMenuItemRequest request);
    MenuItemResponse updateItem(String id, UpdateMenuItemRequest request);
    void setAvailability(String id, boolean available);
    void deleteItem(String id);

    // Categories (MM-02)
    List<CategoryResponse> listCategories();
    CategoryResponse createCategory(CategoryRequest request);
    CategoryResponse updateCategory(String id, CategoryRequest request);
    void reorderCategories(List<String> orderedCategoryIds);
    void deleteCategory(String id);

    // Import / Export (MM-04)
    byte[] exportCsv();
    ImportResultResponse importCsv(MultipartFile file);

    // Public (GO-01)
    List<PublicMenuResponse> getPublicMenu();
}
