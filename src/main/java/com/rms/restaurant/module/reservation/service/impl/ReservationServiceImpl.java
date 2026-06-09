package com.rms.restaurant.module.reservation.service.impl;

import com.rms.restaurant.common.utils.enums.ReservationStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.reservation.dto.CreateReservationRequest;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import com.rms.restaurant.module.reservation.dto.UpdateReservationRequest;
import com.rms.restaurant.module.reservation.mapper.ReservationMapper;
import com.rms.restaurant.module.reservation.model.Reservation;
import com.rms.restaurant.module.reservation.repository.ReservationRepository;
import com.rms.restaurant.module.reservation.service.ReservationService;
import com.rms.restaurant.module.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ReservationServiceImpl implements ReservationService {

    private final ReservationRepository reservationRepository;
    private final TableRepository tableRepository;
    private final ReservationMapper reservationMapper;

    @Override public PageResponse<ReservationResponse> list(Pageable pageable) { return null; }
    @Override public ReservationResponse getById(String id) { return null; }
    @Override
    public ReservationResponse create(CreateReservationRequest request, String createdBy) {
        validateTable(request.tableId());

        Reservation reservation = reservationMapper.toEntity(request);
        reservation.setCreatedBy(createdBy);
        reservation.setStatus(ReservationStatus.PENDING);

        return reservationMapper.toResponse(reservationRepository.save(reservation));
    }
    @Override public ReservationResponse update(String id, UpdateReservationRequest request) { return null; }
    @Override public void cancel(String id) {}
    @Override public void checkIn(String id) {}
    @Override public void markNoShow(String id) {}

    private void validateTable(String tableId) {
        if (tableId == null || tableId.isBlank()) {
            return;
        }
        if (!tableRepository.existsById(tableId)) {
            throw new ApplicationException(ApplicationError.TABLE_NOT_FOUND);
        }
    }
}
