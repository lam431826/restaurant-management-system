package com.rms.restaurant.common.realtime;

import com.rms.restaurant.common.utils.enums.TableStatus;
import com.rms.restaurant.module.guest_ordering.dto.OrderStatusResponse;
import com.rms.restaurant.module.notification.dto.NotificationLogResponse;
import com.rms.restaurant.module.order.dto.OrderResponse;
import com.rms.restaurant.module.order.model.AssistanceRequest;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import com.rms.restaurant.module.shift.dto.ShiftSummaryResponse;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.user.dto.AuditLogResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Fire-and-forget WebSocket broadcasts — same never-roll-back-the-caller's-transaction
 * philosophy as the try/catch-wrapped notification calls in ReservationServiceImpl.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RealtimeEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publishTableStatus(RestaurantTable table) {
        try {
            messagingTemplate.convertAndSend("/topic/tables", new TableStatusEvent(
                    table.getId(), table.getName(), table.getArea(), table.getStatus()));
        } catch (Exception e) {
            log.warn("Failed to publish table status for table {}: {}", table.getId(), e.getMessage());
        }
    }

    public void publishOrderEvent(String eventType, OrderResponse order) {
        try {
            messagingTemplate.convertAndSend("/topic/orders", new OrderEvent(eventType, order));
        } catch (Exception e) {
            log.warn("Failed to publish order event {} for order {}: {}", eventType, order.id(), e.getMessage());
        }
    }

    public void publishGuestOrderStatus(OrderStatusResponse status) {
        try {
            messagingTemplate.convertAndSend("/topic/guest/orders/" + status.orderId(), status);
        } catch (Exception e) {
            log.warn("Failed to publish guest order status for order {}: {}", status.orderId(), e.getMessage());
        }
    }

    /**
     * Staff-side mutations (accept/cooking-status/close/cancel via OrderServiceImpl) don't have
     * GuestOrderingServiceImpl's OrderStatusResponse mapper — but the guest client only uses this
     * push as a signal to refetch (see OrderStatusModal.jsx), so any payload works.
     */
    public void publishGuestOrderStatus(OrderResponse order) {
        try {
            messagingTemplate.convertAndSend("/topic/guest/orders/" + order.id(), order);
        } catch (Exception e) {
            log.warn("Failed to publish guest order status for order {}: {}", order.id(), e.getMessage());
        }
    }

    public void publishAssistanceEvent(String eventType, AssistanceRequest entity) {
        try {
            messagingTemplate.convertAndSend("/topic/assistance", new AssistanceEvent(eventType, entity));
        } catch (Exception e) {
            log.warn("Failed to publish assistance event {} for request {}: {}", eventType, entity.getId(), e.getMessage());
        }
    }

    public void publishAuditEvent(AuditLogResponse entry) {
        try {
            messagingTemplate.convertAndSend("/topic/audit", entry);
        } catch (Exception e) {
            log.warn("Failed to publish audit event {}: {}", entry.id(), e.getMessage());
        }
    }

    public void publishReservationEvent(String eventType, ReservationResponse reservation) {
        try {
            messagingTemplate.convertAndSend("/topic/reservations", new ReservationEvent(eventType, reservation));
        } catch (Exception e) {
            log.warn("Failed to publish reservation event {} for reservation {}: {}",
                    eventType, reservation.id(), e.getMessage());
        }
    }

    public void publishNotificationEvent(NotificationLogResponse notification) {
        try {
            messagingTemplate.convertAndSend("/topic/notifications", notification);
        } catch (Exception e) {
            log.warn("Failed to publish notification event {}: {}", notification.id(), e.getMessage());
        }
    }

    public void publishShiftEvent(String eventType, ShiftSummaryResponse shift) {
        try {
            messagingTemplate.convertAndSend("/topic/shifts", new ShiftEvent(eventType, shift));
        } catch (Exception e) {
            log.warn("Failed to publish shift event {} for shift {}: {}", eventType, shift.id(), e.getMessage());
        }
    }

    public record TableStatusEvent(String tableId, String name, String area, TableStatus status) {}

    public record OrderEvent(String eventType, OrderResponse order) {}

    public record AssistanceEvent(String eventType, AssistanceRequest request) {}

    public record ReservationEvent(String eventType, ReservationResponse reservation) {}

    public record ShiftEvent(String eventType, ShiftSummaryResponse shift) {}
}
