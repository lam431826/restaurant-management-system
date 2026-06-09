package com.rms.restaurant.module.menu.service.impl;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.menu.dto.*;
import com.rms.restaurant.module.menu.service.MenuService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MenuServiceImpl implements MenuService {

    @Override public PageResponse<MenuItemResponse> listItems(Pageable pageable) { return null; }
    @Override public MenuItemResponse createItem(CreateMenuItemRequest request) { return null; }
    @Override public MenuItemResponse updateItem(String id, UpdateMenuItemRequest request) { return null; }
    @Override public void deleteItem(String id) {}
    @Override public List<PublicMenuResponse> getPublicMenu() { return null; }
}
