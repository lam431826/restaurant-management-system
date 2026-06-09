package com.rms.restaurant.module.menu.service;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.menu.dto.*;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface MenuService {
    PageResponse<MenuItemResponse> listItems(Pageable pageable);
    MenuItemResponse createItem(CreateMenuItemRequest request);
    MenuItemResponse updateItem(String id, UpdateMenuItemRequest request);
    void deleteItem(String id);
    List<PublicMenuResponse> getPublicMenu();
}
