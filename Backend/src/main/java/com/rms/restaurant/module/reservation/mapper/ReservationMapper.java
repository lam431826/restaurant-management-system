package com.rms.restaurant.module.reservation.mapper;

import com.rms.restaurant.module.reservation.dto.CreateReservationRequest;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import com.rms.restaurant.module.reservation.model.Reservation;
import org.springframework.stereotype.Component;

@Component
public class ReservationMapper {

    public Reservation toEntity(CreateReservationRequest request) {
        return Reservation.builder()
                .tableId(request.tableId())
                .guestName(request.guestName())
                .phone(request.phone())
                .partySize(request.partySize())
                .datetime(request.datetime())
                .note(request.note())
                .build();
    }

    public ReservationResponse toResponse(Reservation reservation) {
        return new ReservationResponse(
                reservation.getId(),
                reservation.getTableId(),
                reservation.getGuestName(),
                reservation.getPhone(),
                reservation.getGuestEmail(),
                reservation.getPartySize(),
                reservation.getDatetime(),
                reservation.getNote(),
                reservation.getStatus(),
                reservation.getCreatedAt()
        );
    }
}
