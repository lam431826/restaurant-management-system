package com.rms.restaurant.module.roster.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

// WS-03: one staff member assigned to one shift template, anchored on startDate.
// repeatWeekly/repeatDays/repeatEnd describe a recurring rule (mirrors the FE's
// occurrence-expansion model) instead of materializing one row per future date.
@Entity
@Table(name = "roster_assignments")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RosterAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "employee_id", nullable = false)
    private String employeeId;

    @Column(name = "shift_template_id", nullable = false)
    private String shiftTemplateId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "repeat_weekly", nullable = false)
    private boolean repeatWeekly;

    // CSV of java.time.DayOfWeek#getValue() (1=Mon..7=Sun), used when repeatWeekly.
    @Column(name = "repeat_days", length = 20)
    private String repeatDaysCsv;

    @Column(name = "repeat_end")
    private LocalDate repeatEnd;

    @Column(name = "holiday_work", nullable = false)
    private boolean holidayWork;

    // CSV of ISO dates excluded from this rule (approved leave/swap on a single occurrence).
    @Column(name = "excluded_dates", length = 1000)
    private String excludedDatesCsv;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public List<Integer> getRepeatDays() {
        if (!StringUtils.hasText(repeatDaysCsv)) return Collections.emptyList();
        return java.util.Arrays.stream(repeatDaysCsv.split(","))
                .map(String::trim).filter(StringUtils::hasText).map(Integer::parseInt).toList();
    }

    public void setRepeatDays(List<Integer> days) {
        this.repeatDaysCsv = days == null || days.isEmpty() ? null
                : days.stream().map(String::valueOf).collect(Collectors.joining(","));
    }

    public List<LocalDate> getExcludedDates() {
        if (!StringUtils.hasText(excludedDatesCsv)) return Collections.emptyList();
        return java.util.Arrays.stream(excludedDatesCsv.split(","))
                .map(String::trim).filter(StringUtils::hasText).map(LocalDate::parse).toList();
    }

    public void addExcludedDate(LocalDate date) {
        List<LocalDate> dates = new ArrayList<>(getExcludedDates());
        if (!dates.contains(date)) dates.add(date);
        this.excludedDatesCsv = dates.stream().map(LocalDate::toString).collect(Collectors.joining(","));
    }
}
