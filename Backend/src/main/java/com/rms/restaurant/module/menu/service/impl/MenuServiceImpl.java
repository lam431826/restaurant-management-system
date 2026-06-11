package com.rms.restaurant.module.menu.service.impl;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.menu.dto.*;
import com.rms.restaurant.module.menu.service.MenuService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import com.rms.restaurant.module.menu.repository.MenuCategoryRepository;
import com.rms.restaurant.module.menu.repository.MenuItemRepository;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class MenuServiceImpl implements MenuService {

    private final MenuCategoryRepository categoryRepository;
    private final MenuItemRepository itemRepository;

    @Override public PageResponse<MenuItemResponse> listItems(Pageable pageable) { return null; }
    @Override public MenuItemResponse createItem(CreateMenuItemRequest request) { return null; }
    @Override public MenuItemResponse updateItem(String id, UpdateMenuItemRequest request) { return null; }
    @Override public void deleteItem(String id) {}
    
    @Override 
    public List<PublicMenuResponse> getPublicMenu() { 
        return categoryRepository.findAllByOrderByDisplayOrderAsc().stream()
            .map(category -> {
                List<MenuItemResponse> items = itemRepository.findByCategoryIdAndAvailableTrue(category.getId())
                    .stream()
                    .map(item -> new MenuItemResponse(
                        item.getId(),
                        item.getCategoryId(),
                        item.getName(),
                        item.getPrice(),
                        item.getDescription(),
                        item.getImageUrl(),
                        item.isAvailable()
                    ))
                    .collect(Collectors.toList());
                return new PublicMenuResponse(category.getId(), category.getName(), items);
            })
            .filter(response -> !response.items().isEmpty()) // Optional: only return categories with available items
            .collect(Collectors.toList());
    }
}
