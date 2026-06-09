package com.rms.restaurant.module.reporting.dto;

public record TrafficReportResponse(String period, int totalGuests, int totalReservations, double noShowRate, String peakHour) {}
