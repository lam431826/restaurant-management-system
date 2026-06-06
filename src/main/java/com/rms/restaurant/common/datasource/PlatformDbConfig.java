package com.rms.restaurant.common.datasource;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@EnableTransactionManagement
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = "com.rms.restaurant.module")
public class PlatformDbConfig {
    // JPA dialect and naming strategy are configured via application.properties:
    // spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.SQLServerDialect
    // spring.jpa.hibernate.naming.physical-strategy=...
}
