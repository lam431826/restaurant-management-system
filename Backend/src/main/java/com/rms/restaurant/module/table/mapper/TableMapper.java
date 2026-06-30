package com.rms.restaurant.module.table.mapper;

import com.rms.restaurant.module.table.dto.AreaResponse;
import com.rms.restaurant.module.table.dto.TableResponse;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.table.model.TableArea;
import org.springframework.stereotype.Component;

@Component
public class TableMapper {
    public TableResponse toResponse(RestaurantTable table) {
        return toResponse(table, null, null);
    }

    public TableResponse toResponse(RestaurantTable table, String activeOrderId) {
        return toResponse(table, activeOrderId, null);
    }

    public TableResponse toResponse(RestaurantTable table, String activeOrderId,
                                    TableResponse.ReservationSummary reservation) {
        return new TableResponse(
                table.getId(),
                table.getName(),
                table.getNote(),
                table.getArea(),
                table.getCapacity(),
                table.getDisplayOrder(),
                table.isActive(),
                table.getStatus(),
                table.getQrToken(),
                activeOrderId,
                reservation
        );
    }

    public AreaResponse toAreaResponse(TableArea area) {
        return new AreaResponse(area.getId(), area.getName(), area.getNote(), area.getDisplayOrder());
    }
}
