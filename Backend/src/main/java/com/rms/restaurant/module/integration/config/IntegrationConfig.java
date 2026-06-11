package com.rms.restaurant.module.integration.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.integration")
public class IntegrationConfig {

    private String messagingProvider;
    private String paymentProvider;
    private String sendgridApiKey;
    private String twilioAccountSid;
    private String twilioAuthToken;
    private String vnpayTmnCode;
    private String vnpayHashSecret;

    // getters / setters omitted — Lombok not used here to avoid circular config issues
    public String getMessagingProvider() { return messagingProvider; }
    public void setMessagingProvider(String v) { this.messagingProvider = v; }
    public String getPaymentProvider() { return paymentProvider; }
    public void setPaymentProvider(String v) { this.paymentProvider = v; }
    public String getSendgridApiKey() { return sendgridApiKey; }
    public void setSendgridApiKey(String v) { this.sendgridApiKey = v; }
    public String getTwilioAccountSid() { return twilioAccountSid; }
    public void setTwilioAccountSid(String v) { this.twilioAccountSid = v; }
    public String getTwilioAuthToken() { return twilioAuthToken; }
    public void setTwilioAuthToken(String v) { this.twilioAuthToken = v; }
    public String getVnpayTmnCode() { return vnpayTmnCode; }
    public void setVnpayTmnCode(String v) { this.vnpayTmnCode = v; }
    public String getVnpayHashSecret() { return vnpayHashSecret; }
    public void setVnpayHashSecret(String v) { this.vnpayHashSecret = v; }
}
