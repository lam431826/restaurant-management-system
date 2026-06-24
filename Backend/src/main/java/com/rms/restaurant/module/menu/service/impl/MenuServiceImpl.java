package com.rms.restaurant.module.menu.service.impl;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ConflictException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.menu.dto.*;
import com.rms.restaurant.module.menu.mapper.MenuMapper;
import com.rms.restaurant.module.menu.model.MenuCategory;
import com.rms.restaurant.module.menu.model.MenuItem;
import com.rms.restaurant.module.menu.repository.MenuCategoryRepository;
import com.rms.restaurant.module.menu.repository.MenuItemRepository;
import com.rms.restaurant.module.menu.service.MenuService;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class MenuServiceImpl implements MenuService {

    private static final String STATUS_AVAILABLE = "Available";
    private static final String STATUS_OUT_OF_STOCK = "Out_Of_Stock";
    private static final String[] CSV_HEADERS = {
            "code", "name", "category", "price", "costPrice",
            "description", "imageUrl", "menuType", "itemType", "tag", "trackStock", "status"
    };

    private final MenuCategoryRepository categoryRepository;
    private final MenuItemRepository itemRepository;
    private final MenuMapper menuMapper;

    // ── Items (MM-01 / MM-03) ────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MenuItemResponse> searchItems(String q, String categoryId, Boolean available, Pageable pageable) {
        String term = StringUtils.hasText(q) ? q.trim() : null;
        String category = StringUtils.hasText(categoryId) ? categoryId : null;
        Page<MenuItemResponse> page = itemRepository.search(term, category, available, pageable)
                .map(menuMapper::toResponse);
        return PageResponse.of(page);
    }

    @Override
    @Transactional(readOnly = true)
    public MenuItemResponse getItem(String id) {
        return menuMapper.toResponse(findItem(id));
    }

    @Override
    public MenuItemResponse createItem(CreateMenuItemRequest request) {
        requireCategory(request.categoryId());
        MenuItem item = MenuItem.builder()
                .code(trimToNull(request.code()))
                .categoryId(request.categoryId())
                .name(request.name().trim())
                .price(request.price())
                .costPrice(request.costPrice())
                .description(request.description())
                .imageUrl(trimToNull(request.imageUrl()))
                .menuType(trimToNull(request.menuType()))
                .itemType(trimToNull(request.itemType()))
                .tag(trimToNull(request.tag()))
                .trackStock(request.trackStock() != null && request.trackStock())
                .available(request.available() == null || request.available())
                .build();
        return menuMapper.toResponse(itemRepository.save(item));
    }

    @Override
    public MenuItemResponse updateItem(String id, UpdateMenuItemRequest request) {
        MenuItem item = findItem(id);
        if (StringUtils.hasText(request.categoryId())) {
            requireCategory(request.categoryId());
            item.setCategoryId(request.categoryId());
        }
        if (StringUtils.hasText(request.name())) {
            item.setName(request.name().trim());
        }
        if (request.price() != null) {
            item.setPrice(request.price());
        }
        if (request.description() != null) {
            item.setDescription(request.description());
        }
        if (request.imageUrl() != null) {
            item.setImageUrl(trimToNull(request.imageUrl()));
        }
        if (request.code() != null) {
            item.setCode(trimToNull(request.code()));
        }
        if (request.costPrice() != null) {
            item.setCostPrice(request.costPrice());
        }
        if (request.menuType() != null) {
            item.setMenuType(trimToNull(request.menuType()));
        }
        if (request.itemType() != null) {
            item.setItemType(trimToNull(request.itemType()));
        }
        if (request.tag() != null) {
            item.setTag(trimToNull(request.tag()));
        }
        if (request.trackStock() != null) {
            item.setTrackStock(request.trackStock());
        }
        if (request.available() != null) {
            item.setAvailable(request.available());
        }
        return menuMapper.toResponse(itemRepository.save(item));
    }

    @Override
    public void setAvailability(String id, boolean available) {
        MenuItem item = findItem(id);
        item.setAvailable(available);
        itemRepository.save(item);
    }

    @Override
    public void deleteItem(String id) {
        MenuItem item = findItem(id);
        itemRepository.delete(item);
    }

    @Override
    public void bulkSetAvailability(List<String> ids, boolean available) {
        List<MenuItem> items = itemRepository.findAllById(ids);
        items.forEach(item -> item.setAvailable(available));
        itemRepository.saveAll(items);
    }

    @Override
    public void bulkDeleteItems(List<String> ids) {
        itemRepository.deleteAllById(ids);
    }

    // ── Categories (MM-02) ───────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> listCategories() {
        return categoryRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(c -> menuMapper.toCategoryResponse(c, itemRepository.countByCategoryId(c.getId())))
                .collect(Collectors.toList());
    }

    @Override
    public CategoryResponse createCategory(CategoryRequest request) {
        if (categoryRepository.existsByNameIgnoreCase(request.name().trim())) {
            throw new ConflictException(ApplicationError.DUPLICATE_CATEGORY_NAME);
        }
        MenuCategory category = MenuCategory.builder()
                .name(request.name().trim())
                .displayOrder(request.displayOrder())
                .icon(request.icon())
                .build();
        category = categoryRepository.save(category);
        return menuMapper.toCategoryResponse(category, 0);
    }

    @Override
    public CategoryResponse updateCategory(String id, CategoryRequest request) {
        MenuCategory category = findCategory(id);
        String newName = request.name().trim();
        categoryRepository.findByNameIgnoreCase(newName)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> { throw new ConflictException(ApplicationError.DUPLICATE_CATEGORY_NAME); });
        category.setName(newName);
        category.setDisplayOrder(request.displayOrder());
        category.setIcon(request.icon());
        categoryRepository.save(category);
        return menuMapper.toCategoryResponse(category, itemRepository.countByCategoryId(id));
    }

    @Override
    public void reorderCategories(List<String> orderedCategoryIds) {
        for (int i = 0; i < orderedCategoryIds.size(); i++) {
            MenuCategory category = findCategory(orderedCategoryIds.get(i));
            category.setDisplayOrder(i);
            categoryRepository.save(category);
        }
    }

    @Override
    public void deleteCategory(String id) {
        MenuCategory category = findCategory(id);
        if (itemRepository.existsByCategoryId(id)) {
            throw new ConflictException(ApplicationError.CATEGORY_HAS_ITEMS);
        }
        categoryRepository.delete(category);
    }

    // ── Import / Export (MM-04) ──────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv() {
        Map<String, String> categoryNames = categoryRepository.findAll().stream()
                .collect(Collectors.toMap(MenuCategory::getId, MenuCategory::getName));
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        // UTF-8 BOM so Excel renders Vietnamese characters correctly
        out.write(0xEF);
        out.write(0xBB);
        out.write(0xBF);
        try (CSVPrinter printer = new CSVPrinter(
                new java.io.OutputStreamWriter(out, StandardCharsets.UTF_8),
                CSVFormat.DEFAULT.builder().setHeader(CSV_HEADERS).build())) {
            for (MenuItem item : itemRepository.findAll()) {
                printer.printRecord(
                        nullSafe(item.getCode()),
                        item.getName(),
                        categoryNames.getOrDefault(item.getCategoryId(), ""),
                        item.getPrice().toPlainString(),
                        item.getCostPrice() == null ? "" : item.getCostPrice().toPlainString(),
                        nullSafe(item.getDescription()),
                        nullSafe(item.getImageUrl()),
                        nullSafe(item.getMenuType()),
                        nullSafe(item.getItemType()),
                        nullSafe(item.getTag()),
                        item.isTrackStock() ? "true" : "false",
                        item.isAvailable() ? STATUS_AVAILABLE : STATUS_OUT_OF_STOCK
                );
            }
            printer.flush();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }

    @Override
    public ImportResultResponse importCsv(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ConflictException(ApplicationError.MENU_IMPORT_INVALID);
        }

        Map<String, MenuCategory> categoriesByName = categoryRepository.findAll().stream()
                .collect(Collectors.toMap(c -> c.getName().toLowerCase(), Function.identity(), (a, b) -> a));

        int created = 0;
        int updated = 0;
        List<ImportResultResponse.RowError> errors = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader().setSkipHeaderRecord(true).setTrim(true).setIgnoreEmptyLines(true).build()
                     .parse(reader)) {

            for (CSVRecord record : parser) {
                long rowNumber = record.getRecordNumber() + 1; // +1 to account for header row
                try {
                    String name = column(record, "name");
                    if (!StringUtils.hasText(name)) {
                        errors.add(new ImportResultResponse.RowError((int) rowNumber, "Name is required"));
                        continue;
                    }
                    String categoryName = column(record, "category");
                    if (!StringUtils.hasText(categoryName)) {
                        errors.add(new ImportResultResponse.RowError((int) rowNumber, "Category is required"));
                        continue;
                    }
                    // Auto-create the category so it appears in the menu sidebar.
                    MenuCategory category = categoriesByName.get(categoryName.toLowerCase());
                    if (category == null) {
                        category = categoryRepository.save(MenuCategory.builder()
                                .name(categoryName.trim())
                                .displayOrder(categoriesByName.size())
                                .build());
                        categoriesByName.put(categoryName.toLowerCase(), category);
                    }
                    BigDecimal price;
                    try {
                        price = new BigDecimal(column(record, "price"));
                    } catch (NumberFormatException ex) {
                        errors.add(new ImportResultResponse.RowError((int) rowNumber, "Invalid price"));
                        continue;
                    }
                    if (price.signum() < 0) {
                        errors.add(new ImportResultResponse.RowError((int) rowNumber, "Price must not be negative"));
                        continue;
                    }
                    Boolean available = parseStatus(column(record, "status"));
                    if (available == null) {
                        errors.add(new ImportResultResponse.RowError((int) rowNumber,
                                "Status must be " + STATUS_AVAILABLE + " or " + STATUS_OUT_OF_STOCK));
                        continue;
                    }

                    BigDecimal costPrice = null;
                    String costRaw = column(record, "costPrice");
                    if (StringUtils.hasText(costRaw)) {
                        try {
                            costPrice = new BigDecimal(costRaw.trim());
                        } catch (NumberFormatException ex) {
                            errors.add(new ImportResultResponse.RowError((int) rowNumber, "Invalid costPrice"));
                            continue;
                        }
                    }

                    MenuItem item = itemRepository
                            .findByNameIgnoreCaseAndCategoryId(name, category.getId())
                            .orElse(null);
                    boolean isNew = item == null;
                    if (isNew) {
                        item = MenuItem.builder().categoryId(category.getId()).name(name).build();
                    }
                    item.setCode(trimToNull(column(record, "code")));
                    item.setPrice(price);
                    item.setCostPrice(costPrice);
                    item.setDescription(trimToNull(column(record, "description")));
                    item.setImageUrl(trimToNull(column(record, "imageUrl")));
                    item.setMenuType(trimToNull(column(record, "menuType")));
                    item.setItemType(trimToNull(column(record, "itemType")));
                    item.setTag(trimToNull(column(record, "tag")));
                    item.setTrackStock(parseBoolean(column(record, "trackStock")));
                    item.setAvailable(available);
                    itemRepository.save(item);

                    if (isNew) created++; else updated++;
                } catch (Exception rowEx) {
                    errors.add(new ImportResultResponse.RowError((int) rowNumber, "Could not process row: " + rowEx.getMessage()));
                }
            }
        } catch (IOException e) {
            throw new ConflictException(ApplicationError.MENU_IMPORT_INVALID);
        }

        return new ImportResultResponse(created, updated, errors.size(), errors);
    }

    // ── Public (GO-01) ───────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<PublicMenuResponse> getPublicMenu() {
        return categoryRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(category -> {
                    List<PublicMenuItemResponse> items = itemRepository.findByCategoryIdAndAvailableTrue(category.getId())
                            .stream()
                            .map(menuMapper::toPublicResponse)
                            .collect(Collectors.toList());
                    return new PublicMenuResponse(category.getId(), category.getName(), items);
                })
                .filter(response -> !response.items().isEmpty())
                .collect(Collectors.toList());
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private MenuItem findItem(String id) {
        return itemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.MENU_ITEM_NOT_FOUND));
    }

    private MenuCategory findCategory(String id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.CATEGORY_NOT_FOUND));
    }

    private void requireCategory(String categoryId) {
        if (!categoryRepository.existsById(categoryId)) {
            throw new ResourceNotFoundException(ApplicationError.CATEGORY_NOT_FOUND);
        }
    }

    private String column(CSVRecord record, String name) {
        return record.isMapped(name) ? record.get(name) : null;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private boolean parseBoolean(String value) {
        if (!StringUtils.hasText(value)) return false;
        String v = value.trim();
        return v.equalsIgnoreCase("true") || v.equals("1") || v.equalsIgnoreCase("yes");
    }

    /** Returns true=Available, false=Out_Of_Stock, null=invalid. Blank defaults to Available. */
    private Boolean parseStatus(String status) {
        if (!StringUtils.hasText(status)) return Boolean.TRUE;
        String normalized = status.trim();
        if (normalized.equalsIgnoreCase(STATUS_AVAILABLE)) return Boolean.TRUE;
        if (normalized.equalsIgnoreCase(STATUS_OUT_OF_STOCK)) return Boolean.FALSE;
        return null;
    }
}
