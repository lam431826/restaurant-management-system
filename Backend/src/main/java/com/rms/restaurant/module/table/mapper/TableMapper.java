package com.rms.restaurant.module.table.mapper;

import com.rms.restaurant.module.table.dto.AreaResponse;
import com.rms.restaurant.module.table.dto.TableResponse;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.table.model.TableArea;
import org.springframework.stereotype.Component;

@Component
public class TableMapper {
    public TableResponse toResponse(RestaurantTable table) {
        return new TableResponse(
                table.getId(),
                table.getName(),
                table.getNote(),
                table.getArea(),
                table.getCapacity(),
                table.getDisplayOrder(),
                table.isActive(),
                table.getStatus(),
                table.getQrToken()
        );
    }

    public AreaResponse toAreaResponse(TableArea area) {
        return new AreaResponse(area.getId(), area.getName(), area.getNote(), area.getDisplayOrder());
    }
}
