package com.rms.restaurant.module.payment.service.internal;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.net.URLEncoder;
import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * VNPAY Sandbox request-signing and callback-verification. Pure protocol mechanics — no
 * business rules, no DB access. Every vnp_* value handled here comes from either our own
 * generation (TxnRef, CreateDate, ExpireDate) or the gateway's response; nothing here trusts
 * anything supplied by the browser/frontend.
 */
@Service
public class VnpayService {

    private static final String HMAC_ALGORITHM = "HmacSHA512";
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    public static final DateTimeFormatter VNP_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final SecureRandom RANDOM = new SecureRandom();

    /** Now, in the GMT+7 timezone the VNPAY contract requires for vnp_CreateDate/vnp_ExpireDate. */
    public ZonedDateTime nowInVietnam() {
        return ZonedDateTime.now(VN_ZONE);
    }

    /**
     * A unique merchant transaction reference. Deliberately not the invoice's own HDxxxxxx
     * business code alone (the same invoice can have multiple attempts — a retried or
     * re-initiated payment must not collide with, or be confused for, an earlier one).
     */
    public String generateTxnRef() {
        String timestamp = nowInVietnam().format(VNP_DATE_FORMAT);
        byte[] suffix = new byte[4];
        RANDOM.nextBytes(suffix);
        StringBuilder hex = new StringBuilder();
        for (byte b : suffix) hex.append(String.format("%02X", b));
        return "RMS" + timestamp + hex;
    }

    /** A unique id for a single QueryDR request (distinct from the transaction's TxnRef). */
    public String generateRequestId() {
        byte[] raw = new byte[8];
        RANDOM.nextBytes(raw);
        StringBuilder hex = new StringBuilder();
        for (byte b : raw) hex.append(String.format("%02X", b));
        return hex.toString();
    }

    /**
     * QueryDR checksum input. Unlike the pay-URL checksum this is NOT the sorted query
     * string — VNPAY specifies a fixed, pipe-separated field order for this command, and
     * the values are raw (not URL-encoded):
     * {@code requestId|version|command|tmnCode|txnRef|transactionDate|createDate|ipAddr|orderInfo}
     */
    public String buildQueryDrChecksumData(
            String requestId, String version, String command, String tmnCode, String txnRef,
            String transactionDate, String createDate, String ipAddr, String orderInfo
    ) {
        return String.join("|",
                nullToEmpty(requestId), nullToEmpty(version), nullToEmpty(command),
                nullToEmpty(tmnCode), nullToEmpty(txnRef), nullToEmpty(transactionDate),
                nullToEmpty(createDate), nullToEmpty(ipAddr), nullToEmpty(orderInfo));
    }

    /**
     * QueryDR *response* checksum input — again a fixed pipe-separated order, per VNPAY's
     * querydr response spec. Absent optional fields participate as empty strings.
     */
    public String buildQueryDrResponseChecksumData(Map<String, String> response) {
        return String.join("|",
                nullToEmpty(response.get("vnp_ResponseId")),
                nullToEmpty(response.get("vnp_Command")),
                nullToEmpty(response.get("vnp_ResponseCode")),
                nullToEmpty(response.get("vnp_Message")),
                nullToEmpty(response.get("vnp_TmnCode")),
                nullToEmpty(response.get("vnp_TxnRef")),
                nullToEmpty(response.get("vnp_Amount")),
                nullToEmpty(response.get("vnp_BankCode")),
                nullToEmpty(response.get("vnp_PayDate")),
                nullToEmpty(response.get("vnp_TransactionNo")),
                nullToEmpty(response.get("vnp_TransactionType")),
                nullToEmpty(response.get("vnp_TransactionStatus")),
                nullToEmpty(response.get("vnp_OrderInfo")),
                nullToEmpty(response.get("vnp_PromotionCode")),
                nullToEmpty(response.get("vnp_PromotionAmount")));
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    /**
     * Builds the sorted, URL-encoded "key1=value1&key2=value2..." string used both as the
     * HMAC input and (with vnp_SecureHash appended) as the final query string. Sorting is
     * mandatory: VNPAY validates the checksum against params in ascending key order.
     */
    public String buildSignableQuery(Map<String, String> params) {
        SortedMap<String, String> sorted = new TreeMap<>(params);
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Map.Entry<String, String> entry : sorted.entrySet()) {
            String value = entry.getValue();
            if (value == null || value.isEmpty()) continue;
            if (!first) sb.append('&');
            sb.append(entry.getKey()).append('=')
                    .append(URLEncoder.encode(value, StandardCharsets.UTF_8));
            first = false;
        }
        return sb.toString();
    }

    public String hmacSha512Hex(String hashSecret, String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(hashSecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            byte[] result = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : result) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute VNPAY HMAC-SHA512 signature", e);
        }
    }

    /** Builds the full signed redirect URL: {@code payUrl?sorted&query=string&vnp_SecureHash=...}. */
    public String buildPaymentUrl(String payUrl, Map<String, String> params, String hashSecret) {
        String signable = buildSignableQuery(params);
        String hash = hmacSha512Hex(hashSecret, signable);
        return payUrl + "?" + signable + "&vnp_SecureHash=" + hash;
    }

    /** Recomputes the checksum over every vnp_* param except the hash fields themselves. */
    public boolean verifySignature(Map<String, String> params, String hashSecret, String receivedHash) {
        if (receivedHash == null || receivedHash.isBlank()) return false;
        Map<String, String> signable = new TreeMap<>(params);
        signable.remove("vnp_SecureHash");
        signable.remove("vnp_SecureHashType");
        String computed = hmacSha512Hex(hashSecret, buildSignableQuery(signable));
        return computed.equalsIgnoreCase(receivedHash.trim());
    }
}
