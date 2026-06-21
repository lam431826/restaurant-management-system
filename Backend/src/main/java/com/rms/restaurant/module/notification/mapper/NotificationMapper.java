package com.rms.restaurant.module.notification.mapper;

import com.rms.restaurant.module.notification.dto.NotificationLogResponse;
import com.rms.restaurant.module.notification.model.NotificationLog;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    @Mapping(target = "channel", expression = "java(log.getChannel() != null ? log.getChannel().name() : null)")
    NotificationLogResponse toResponse(NotificationLog log);
}
