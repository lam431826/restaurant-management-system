package com.rms.restaurant.module.attendance.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * BR-AT-04: nightly extension of endless repeat rules to keep the 93-day materialized
 * window sliding. Scheduling is enabled globally (see AsyncConfig). Rule creation also
 * materializes immediately, so this job only tops up the tail.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ScheduleExtensionJob {

    private final WorkScheduleService workScheduleService;

    @Scheduled(cron = "0 15 2 * * *")
    public void extendRollingWindow() {
        log.info("Extending endless schedule rules to the 93-day horizon (BR-AT-04)");
        workScheduleService.extendRollingWindow();
    }
}
