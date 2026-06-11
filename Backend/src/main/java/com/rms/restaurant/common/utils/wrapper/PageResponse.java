package com.rms.restaurant.common.utils.wrapper;

import lombok.Getter;
import org.springframework.data.domain.Page;

import java.util.List;

@Getter
public class PageResponse<T> {

    private final List<T> data;
    private final PaginationMeta pagination;

    private PageResponse(List<T> data, PaginationMeta pagination) {
        this.data = data;
        this.pagination = pagination;
    }

    public static <T> PageResponse<T> of(Page<T> page) {
        PaginationMeta meta = new PaginationMeta(
                page.getNumber() + 1,
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
        return new PageResponse<>(page.getContent(), meta);
    }

    public record PaginationMeta(int page, int limit, long total, int totalPages) {}
}
