package com.rms.restaurant.module.reporting.repository;

import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class ReportQueryRepository {

    @PersistenceContext
    private EntityManager em;
}
