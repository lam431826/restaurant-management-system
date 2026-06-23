package com.rms.restaurant.module.table.mapper;

import com.rms.restaurant.module.table.dto.TableResponse;
import com.rms.restaurant.module.table.model.RestaurantTable;
import org.springframework.stereotype.Component;

@Component
public class TableMapper {
    public TableResponse toResponse(RestaurantTable table) {
        return new TableResponse(
                table.getId(),
                table.getName(),
                table.getCapacity(),
                table.getArea(),
                table.getStatus(),
                table.getQrToken()
        );
    }
}
