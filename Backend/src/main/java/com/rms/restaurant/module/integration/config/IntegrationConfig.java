package com.rms.restaurant.module.integration.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.integration")
public class IntegrationConfig {

    private String paymentProvider;
    private String vnpayTmnCode;
    private String vnpayHashSecret;

    public String getPaymentProvider() { return paymentProvider; }
    public void setPaymentProvider(String v) { this.paymentProvider = v; }
    public String getVnpayTmnCode() { return vnpayTmnCode; }
    public void setVnpayTmnCode(String v) { this.vnpayTmnCode = v; }
    public String getVnpayHashSecret() { return vnpayHashSecret; }
    public void setVnpayHashSecret(String v) { this.vnpayHashSecret = v; }
}
