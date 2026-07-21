package com.rms.restaurant.module.payment.service.internal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.payment.config.VnpayProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Server-to-server VNPAY QueryDR caller. Used to reconcile an attempt whose IPN never
 * arrived — the normal case on a developer machine, where VNPAY cannot reach localhost.
 *
 * <p>Transport only: it signs the request, POSTs it, verifies the response checksum, and
 * hands back a {@link VnpayQueryResult}. It makes no business decisions and touches no
 * database. Any transport-level problem surfaces as a retryable
 * {@code PAYMENT_GATEWAY_UNAVAILABLE} rather than being mistaken for "not paid".
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VnpayQueryClient {

    private static final Duration TIMEOUT = Duration.ofSeconds(15);
    private static final String VERSION = "2.1.0";
    private static final String COMMAND = "querydr";

    private final VnpayProperties vnpayProperties;
    private final VnpayService vnpayService;
    private final ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .build();

    /**
     * @param transactionDate the ORIGINAL vnp_CreateDate of the pay request, replayed
     *                        byte-for-byte (VNPAY matches on it).
     */
    public VnpayQueryResult query(String txnRef, String transactionDate, String orderInfo, String clientIp) {
        String requestId = vnpayService.generateRequestId();
        ZonedDateTime nowVn = vnpayService.nowInVietnam();
        String createDate = nowVn.format(VnpayService.VNP_DATE_FORMAT);
        String ipAddr = (clientIp == null || clientIp.isBlank()) ? "127.0.0.1" : clientIp;

        String checksumData = vnpayService.buildQueryDrChecksumData(
                requestId, VERSION, COMMAND, vnpayProperties.getTmnCode(), txnRef,
                transactionDate, createDate, ipAddr, orderInfo);
        String secureHash = vnpayService.hmacSha512Hex(vnpayProperties.getHashSecret(), checksumData);

        Map<String, String> body = new LinkedHashMap<>();
        body.put("vnp_RequestId", requestId);
        body.put("vnp_Version", VERSION);
        body.put("vnp_Command", COMMAND);
        body.put("vnp_TmnCode", vnpayProperties.getTmnCode());
        body.put("vnp_TxnRef", txnRef);
        body.put("vnp_OrderInfo", orderInfo);
        body.put("vnp_TransactionDate", transactionDate);
        body.put("vnp_CreateDate", createDate);
        body.put("vnp_IpAddr", ipAddr);
        body.put("vnp_SecureHash", secureHash);

        String responseBody;
        try {
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(vnpayProperties.getQueryUrl()))
                    .timeout(TIMEOUT)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> httpResponse =
                    httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (httpResponse.statusCode() < 200 || httpResponse.statusCode() >= 300) {
                log.warn("VNPAY QueryDR returned HTTP {} for txnRef {}", httpResponse.statusCode(), txnRef);
                throw new ApplicationException(ApplicationError.PAYMENT_GATEWAY_UNAVAILABLE);
            }
            responseBody = httpResponse.body();
        } catch (ApplicationException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ApplicationException(ApplicationError.PAYMENT_GATEWAY_UNAVAILABLE);
        } catch (Exception e) {
            // Never let a transport failure look like "the customer did not pay".
            log.warn("VNPAY QueryDR call failed for txnRef {}: {}", txnRef, e.getMessage());
            throw new ApplicationException(ApplicationError.PAYMENT_GATEWAY_UNAVAILABLE);
        }

        Map<String, String> response = parseResponse(responseBody, txnRef);
        String receivedHash = response.get("vnp_SecureHash");
        boolean signatureValid = receivedHash != null && !receivedHash.isBlank()
                && vnpayService.hmacSha512Hex(
                        vnpayProperties.getHashSecret(),
                        vnpayService.buildQueryDrResponseChecksumData(response))
                .equalsIgnoreCase(receivedHash.trim());

        return new VnpayQueryResult(
                signatureValid,
                response.get("vnp_ResponseCode"),
                response.get("vnp_TransactionStatus"),
                response.get("vnp_TmnCode"),
                response.get("vnp_TxnRef"),
                response.get("vnp_Amount"),
                response.get("vnp_TransactionNo"),
                response.get("vnp_BankCode"),
                response.get("vnp_PayDate"),
                response.get("vnp_Message"),
                response
        );
    }

    private Map<String, String> parseResponse(String responseBody, String txnRef) {
        try {
            Map<String, Object> parsed = objectMapper.readValue(responseBody, Map.class);
            Map<String, String> flat = new LinkedHashMap<>();
            parsed.forEach((key, value) -> flat.put(key, value == null ? null : String.valueOf(value)));
            return flat;
        } catch (Exception e) {
            log.warn("VNPAY QueryDR returned an unparseable body for txnRef {}", txnRef);
            throw new ApplicationException(ApplicationError.PAYMENT_GATEWAY_UNAVAILABLE);
        }
    }
}
