package com.rms.restaurant.common.utils.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.mail.MailProperties;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@rms.com}")
    private String fromAddress;

    // Read through MailProperties rather than @Value: MAIL_USERNAME/MAIL_PASSWORD have no
    // defaults in application.properties, and @Value resolves nested placeholders strictly,
    // which would break startup when those environment variables are absent. Boot's own
    // binding leaves the unresolved "${MAIL_USERNAME}" text instead, which we detect below.
    private final MailProperties mailProperties;

    public void sendTempPasswordEmail(String toEmail, String recipientName, String tempPassword) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(toEmail);
        msg.setSubject("Thông tin tài khoản RMS");
        msg.setText(
            "Xin chào " + recipientName + ",\n\n" +
            "Tài khoản của bạn đã được tạo trên hệ thống RMS.\n" +
            "Mật khẩu tạm thời: " + tempPassword + "\n\n" +
            "Vui lòng đăng nhập và đổi mật khẩu ngay sau khi kích hoạt tài khoản.\n\n" +
            "Trân trọng,\nHệ thống RMS"
        );
        mailSender.send(msg);
    }

    public void sendOtpEmail(String toEmail, String recipientName, String otpCode) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(toEmail);
        msg.setSubject("Mã xác thực tài khoản RMS");
        msg.setText(
            "Xin chào " + recipientName + ",\n\n" +
            "Mã OTP để kích hoạt tài khoản của bạn là: " + otpCode + "\n\n" +
            "Mã có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.\n\n" +
            "Trân trọng,\nHệ thống RMS"
        );
        mailSender.send(msg);
    }

    // ── NM-01: Reservation notifications ─────────────────────────────────────

    public void sendReservationConfirmationEmail(String toEmail, String guestName,
            LocalDateTime datetime, int partySize, String reservationId) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(toEmail);
        msg.setSubject("Xác nhận đặt bàn tại Wasabi Restaurant");
        msg.setText(
            "Xin chào " + guestName + ",\n\n" +
            "Đặt bàn của bạn đã được xác nhận!\n\n" +
            "Chi tiết đặt bàn:\n" +
            "  - Thời gian  : " + datetime.format(DATETIME_FORMATTER) + "\n" +
            "  - Số khách   : " + partySize + " người\n\n" +
            "Vui lòng đến đúng giờ. Chúng tôi sẽ giữ bàn trong 15 phút sau giờ đặt.\n" +
            "Nếu cần hủy hoặc thay đổi, vui lòng liên hệ nhà hàng trước ít nhất 2 tiếng.\n\n" +
            "Trân trọng,\nWasabi Restaurant"
        );
        mailSender.send(msg);
    }

    public void sendReservationReminderEmail(String toEmail, String guestName,
            LocalDateTime datetime) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(toEmail);
        msg.setSubject("Nhắc nhở: Đặt bàn tại Wasabi Restaurant sau 1 tiếng nữa");
        msg.setText(
            "Xin chào " + guestName + ",\n\n" +
            "Đây là thông báo nhắc nhở: bạn có đặt bàn tại Wasabi Restaurant lúc " +
            datetime.format(DATETIME_FORMATTER) + ".\n\n" +
            "Chúng tôi rất mong được đón tiếp bạn!\n\n" +
            "Trân trọng,\nWasabi Restaurant"
        );
        mailSender.send(msg);
    }

    public void sendReservationCancellationEmail(String toEmail, String guestName,
            LocalDateTime datetime) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(toEmail);
        msg.setSubject("Xác nhận hủy đặt bàn tại Wasabi Restaurant");
        msg.setText(
            "Xin chào " + guestName + ",\n\n" +
            "Đặt bàn của bạn vào lúc " + datetime.format(DATETIME_FORMATTER) +
            " đã được hủy thành công.\n\n" +
            "Nếu bạn muốn đặt bàn lại, vui lòng truy cập website hoặc liên hệ nhà hàng.\n\n" +
            "Trân trọng,\nWasabi Restaurant"
        );
        mailSender.send(msg);
    }

    // ── RM-08 / BR-04: No-show ────────────────────────────────────────────────

    public void sendNoShowEmail(String toEmail, String guestName, LocalDateTime datetime) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(toEmail);
        msg.setSubject("[Wasabi Restaurant] Đặt bàn đã bị hủy do không đến đúng giờ");
        msg.setText(
            "Xin chào " + guestName + ",\n\n" +
            "Đặt bàn của bạn vào lúc " + datetime.format(DATETIME_FORMATTER) +
            " đã bị hủy do quá 15 phút mà chúng tôi chưa thấy bạn đến nhận bàn.\n\n" +
            "Nếu đây là sự nhầm lẫn hoặc bạn vẫn muốn dùng bữa, vui lòng liên hệ nhà hàng hoặc đặt bàn lại.\n\n" +
            "Trân trọng,\nWasabi Restaurant"
        );
        mailSender.send(msg);
    }

    // ── NM-01: Table assignment/transfer notification ─────────────────────────

    public void sendTableUpdateEmail(String toEmail, String guestName, String tableName,
            LocalDateTime datetime, int partySize, String reservationId) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(toEmail);
        msg.setSubject("[Wasabi Restaurant] Cập nhật bàn ngồi");
        msg.setText(
            "Xin chào " + guestName + ",\n\n" +
            "Thông tin bàn ngồi trong đặt bàn của bạn đã được cập nhật.\n\n" +
            "Chi tiết:\n" +
            "  - Thời gian  : " + datetime.format(DATETIME_FORMATTER) + "\n" +
            "  - Số khách   : " + partySize + " người\n" +
            "  - Bàn mới    : " + tableName + "\n\n" +
            "Nếu bạn có thắc mắc, vui lòng liên hệ nhà hàng.\n\n" +
            "Trân trọng,\nWasabi Restaurant"
        );
        mailSender.send(msg);
    }

    // ── NM-02: Payment confirmation ───────────────────────────────────────────

    public void sendPaymentConfirmationEmail(String toEmail, String guestName,
            BigDecimal totalAmount, String invoiceId) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(toEmail);
        msg.setSubject("Xác nhận thanh toán thành công - Wasabi Restaurant");
        msg.setText(
            "Xin chào " + guestName + ",\n\n" +
            "Thanh toán của bạn đã được xử lý thành công.\n\n" +
            "Chi tiết hóa đơn:\n" +
            "  - Mã hóa đơn  : " + invoiceId + "\n" +
            "  - Tổng tiền   : " + String.format("%,.0f VNĐ", totalAmount) + "\n\n" +
            "Cảm ơn bạn đã dùng bữa tại Wasabi Restaurant. Hẹn gặp lại!\n\n" +
            "Trân trọng,\nWasabi Restaurant"
        );
        mailSender.send(msg);
    }

    // ── PM: Invoice delivery ──────────────────────────────────────────────────

    /**
     * True when outgoing mail has enough configuration to attempt a send. Host and
     * username come from environment variables; when they are absent the caller should
     * surface MAIL_CONFIGURATION_MISSING instead of pretending the mail was sent.
     */
    public boolean isConfigured() {
        return isResolved(mailProperties.getHost())
                && isResolved(mailProperties.getUsername())
                && isResolved(mailProperties.getPassword());
    }

    /** Blank, or still an unresolved "${VAR}" placeholder, both mean "not configured". */
    private static boolean isResolved(String value) {
        return value != null && !value.isBlank() && !value.startsWith("${");
    }

    private static final String RESTAURANT_NAME = "Wasabi Sushi";

    /** One printed line of the invoice email — mirrors the receipt's item row. */
    public record InvoiceEmailLine(
            String name, int quantity, BigDecimal unitPrice, BigDecimal lineTotal) {}

    /** A rejected/non-payable item — mirrors the receipt's "Món đã hủy bởi nhà hàng" row. */
    public record NonPayableEmailLine(String name, int quantity, String note) {}

    private static final String NON_PAYABLE_FALLBACK_NOTE = "Nhà hàng không thể phục vụ món này.";

    private static String money(BigDecimal amount) {
        return String.format("%,.0f VNĐ", amount == null ? BigDecimal.ZERO : amount);
    }

    private static String htmlEscape(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    /**
     * Sends the invoice to the customer as a full receipt-style email (items, totals,
     * payment status). Synchronous on purpose: the caller reports success to the cashier
     * only after JavaMailSender has accepted the message. Every value comes from backend
     * data the caller already looked up — nothing here is guessed or invented.
     */
    public void sendInvoiceEmail(
            String toEmail,
            String guestName,
            String customerPhone,
            String invoiceCode,
            String orderCode,
            String tableName,
            String cashierName,
            String shiftLabel,
            List<InvoiceEmailLine> items,
            List<NonPayableEmailLine> nonPayableItems,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            BigDecimal totalAmount,
            boolean paid,
            String paymentMethodLabel,
            LocalDateTime invoiceTime
    ) {
        String displayName = (guestName == null || guestName.isBlank()) ? "Khách lẻ" : guestName;
        String invoiceTimeText = invoiceTime.format(DATETIME_FORMATTER);
        String statusLabel = paid ? "Đã thanh toán" : "Chưa thanh toán";

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject(RESTAURANT_NAME + " - Hóa đơn " + invoiceCode);
            helper.setText(
                    buildInvoicePlainText(displayName, customerPhone, toEmail, tableName,
                            invoiceCode, orderCode, invoiceTimeText, cashierName, shiftLabel,
                            items, nonPayableItems, subtotal, discountAmount, totalAmount,
                            statusLabel, paymentMethodLabel),
                    buildInvoiceHtml(displayName, customerPhone, toEmail, tableName,
                            invoiceCode, orderCode, invoiceTimeText, cashierName, shiftLabel,
                            items, nonPayableItems, subtotal, discountAmount, totalAmount,
                            statusLabel, paymentMethodLabel)
            );
            mailSender.send(mimeMessage);
        } catch (MessagingException e) {
            // Wrapped as unchecked: every other GmailService method is unchecked, and the
            // caller (NotificationDispatcher) already treats any exception here as a
            // delivery failure to record in the notification log.
            throw new IllegalStateException("Failed to build invoice email", e);
        }
    }

    private String buildInvoicePlainText(
            String displayName, String customerPhone, String customerEmail, String tableName,
            String invoiceCode, String orderCode, String invoiceTimeText,
            String cashierName, String shiftLabel,
            List<InvoiceEmailLine> items, List<NonPayableEmailLine> nonPayableItems,
            BigDecimal subtotal, BigDecimal discountAmount,
            BigDecimal totalAmount, String statusLabel, String paymentMethodLabel
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append(RESTAURANT_NAME).append("\nHóa đơn thanh toán\n\n");
        sb.append("Mã hóa đơn : ").append(invoiceCode).append('\n');
        sb.append("Mã đơn hàng: ").append(orderCode).append('\n');
        sb.append("Thời gian  : ").append(invoiceTimeText).append('\n');
        if (cashierName != null && !cashierName.isBlank()) {
            sb.append("Thu ngân   : ").append(cashierName).append('\n');
        }
        if (shiftLabel != null && !shiftLabel.isBlank()) {
            sb.append("Ca làm     : ").append(shiftLabel).append('\n');
        }
        sb.append('\n');

        sb.append("Khách hàng : ").append(displayName).append('\n');
        if (customerPhone != null && !customerPhone.isBlank()) {
            sb.append("Điện thoại : ").append(customerPhone).append('\n');
        }
        sb.append("Email      : ").append(customerEmail).append('\n');
        if (tableName != null && !tableName.isBlank()) {
            sb.append("Bàn        : ").append(tableName).append('\n');
        }
        sb.append("Hình thức  : Tại bàn\n\n");

        sb.append("Chi tiết món:\n");
        for (InvoiceEmailLine line : items) {
            sb.append("  - ").append(line.name())
              .append(" x").append(line.quantity())
              .append(" (").append(money(line.unitPrice())).append(")")
              .append(" = ").append(money(line.lineTotal())).append('\n');
        }

        if (nonPayableItems != null && !nonPayableItems.isEmpty()) {
            sb.append("\nMón đã hủy bởi nhà hàng:\n");
            for (NonPayableEmailLine line : nonPayableItems) {
                String note = (line.note() == null || line.note().isBlank())
                        ? NON_PAYABLE_FALLBACK_NOTE : line.note();
                sb.append("  - ").append(line.name())
                  .append(" x").append(line.quantity())
                  .append(" (Không tính tiền) — Ghi chú: ").append(note).append('\n');
            }
        }

        sb.append("\nTạm tính     : ").append(money(subtotal)).append('\n');
        sb.append("Giảm giá     : ").append(money(discountAmount)).append('\n');
        sb.append("Tổng thanh toán: ").append(money(totalAmount)).append("\n\n");

        sb.append("Trạng thái   : ").append(statusLabel).append('\n');
        if (paymentMethodLabel != null && !paymentMethodLabel.isBlank()) {
            sb.append("Phương thức  : ").append(paymentMethodLabel).append('\n');
        }

        sb.append("\nCảm ơn quý khách đã dùng bữa tại ").append(RESTAURANT_NAME)
          .append(". Hẹn gặp lại!\n\n");
        sb.append("Đây là email hóa đơn được gửi tự động từ hệ thống, vui lòng không trả lời email này.");
        return sb.toString();
    }

    private String buildInvoiceHtml(
            String displayName, String customerPhone, String customerEmail, String tableName,
            String invoiceCode, String orderCode, String invoiceTimeText,
            String cashierName, String shiftLabel,
            List<InvoiceEmailLine> items, List<NonPayableEmailLine> nonPayableItems,
            BigDecimal subtotal, BigDecimal discountAmount,
            BigDecimal totalAmount, String statusLabel, String paymentMethodLabel
    ) {
        StringBuilder rows = new StringBuilder();
        for (InvoiceEmailLine line : items) {
            rows.append("<tr>")
                .append("<td style=\"padding:6px 8px;border-bottom:1px solid #eee;\">").append(htmlEscape(line.name())).append("</td>")
                .append("<td style=\"padding:6px 8px;border-bottom:1px solid #eee;text-align:center;\">").append(line.quantity()).append("</td>")
                .append("<td style=\"padding:6px 8px;border-bottom:1px solid #eee;text-align:right;\">").append(money(line.unitPrice())).append("</td>")
                .append("<td style=\"padding:6px 8px;border-bottom:1px solid #eee;text-align:right;\">").append(money(line.lineTotal())).append("</td>")
                .append("</tr>");
        }

        String phoneRow = (customerPhone == null || customerPhone.isBlank())
                ? "" : "<tr><td style=\"color:#636566;padding:2px 0;\">Điện thoại</td><td style=\"padding:2px 0;\">" + htmlEscape(customerPhone) + "</td></tr>";
        String tableRow = (tableName == null || tableName.isBlank())
                ? "" : "<tr><td style=\"color:#636566;padding:2px 0;\">Bàn</td><td style=\"padding:2px 0;\">" + htmlEscape(tableName) + "</td></tr>";
        String methodRow = (paymentMethodLabel == null || paymentMethodLabel.isBlank())
                ? "" : "<tr><td style=\"color:#636566;padding:6px 0;\">Phương thức</td><td style=\"padding:6px 0;font-weight:600;\">" + htmlEscape(paymentMethodLabel) + "</td></tr>";
        String cashierRow = (cashierName == null || cashierName.isBlank())
                ? "" : "<tr><td style=\"color:#636566;padding:2px 0;\">Thu ngân</td><td style=\"padding:2px 0;\">" + htmlEscape(cashierName) + "</td></tr>";
        String shiftRow = (shiftLabel == null || shiftLabel.isBlank())
                ? "" : "<tr><td style=\"color:#636566;padding:2px 0;\">Ca làm</td><td style=\"padding:2px 0;\">" + htmlEscape(shiftLabel) + "</td></tr>";

        StringBuilder nonPayableSection = new StringBuilder();
        if (nonPayableItems != null && !nonPayableItems.isEmpty()) {
            StringBuilder nonPayableRows = new StringBuilder();
            for (NonPayableEmailLine line : nonPayableItems) {
                String note = (line.note() == null || line.note().isBlank())
                        ? NON_PAYABLE_FALLBACK_NOTE : line.note();
                nonPayableRows.append("<tr>")
                    .append("<td style=\"padding:6px 8px;border-bottom:1px solid #eee;\">").append(htmlEscape(line.name()))
                    .append("<br/><span style=\"color:#a2a4a4;font-size:12px;\">Ghi chú: ").append(htmlEscape(note)).append("</span></td>")
                    .append("<td style=\"padding:6px 8px;border-bottom:1px solid #eee;text-align:center;\">").append(line.quantity()).append("</td>")
                    .append("<td style=\"padding:6px 8px;border-bottom:1px solid #eee;text-align:right;\">Không tính tiền</td>")
                    .append("</tr>");
            }
            nonPayableSection
                .append("<p style=\"font-size:13px;font-weight:700;margin:0 0 6px;\">Món đã hủy bởi nhà hàng</p>")
                .append("<table style=\"width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;\">")
                .append("<tbody>").append(nonPayableRows).append("</tbody></table>");
        }

        return "<div style=\"font-family:Arial,Helvetica,sans-serif;color:#202325;max-width:560px;margin:0 auto;\">"
            + "<h2 style=\"margin:0 0 2px;\">" + RESTAURANT_NAME + "</h2>"
            + "<p style=\"margin:0 0 16px;color:#636566;\">Hóa đơn thanh toán</p>"
            + "<table style=\"width:100%;font-size:14px;margin-bottom:16px;\">"
            + "<tr><td style=\"color:#636566;padding:2px 0;\">Mã hóa đơn</td><td style=\"padding:2px 0;font-weight:600;\">" + invoiceCode + "</td></tr>"
            + "<tr><td style=\"color:#636566;padding:2px 0;\">Mã đơn hàng</td><td style=\"padding:2px 0;\">" + orderCode + "</td></tr>"
            + "<tr><td style=\"color:#636566;padding:2px 0;\">Thời gian</td><td style=\"padding:2px 0;\">" + invoiceTimeText + "</td></tr>"
            + cashierRow
            + shiftRow
            + "</table>"
            + "<table style=\"width:100%;font-size:14px;margin-bottom:16px;\">"
            + "<tr><td style=\"color:#636566;padding:2px 0;\">Khách hàng</td><td style=\"padding:2px 0;font-weight:600;\">" + htmlEscape(displayName) + "</td></tr>"
            + phoneRow
            + "<tr><td style=\"color:#636566;padding:2px 0;\">Email</td><td style=\"padding:2px 0;\">" + htmlEscape(customerEmail) + "</td></tr>"
            + tableRow
            + "<tr><td style=\"color:#636566;padding:2px 0;\">Hình thức</td><td style=\"padding:2px 0;\">Tại bàn</td></tr>"
            + "</table>"
            + "<table style=\"width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px;\">"
            + "<thead><tr>"
            + "<th style=\"text-align:left;padding:6px 8px;border-bottom:2px solid #202325;\">Món</th>"
            + "<th style=\"text-align:center;padding:6px 8px;border-bottom:2px solid #202325;\">SL</th>"
            + "<th style=\"text-align:right;padding:6px 8px;border-bottom:2px solid #202325;\">Đơn giá</th>"
            + "<th style=\"text-align:right;padding:6px 8px;border-bottom:2px solid #202325;\">Thành tiền</th>"
            + "</tr></thead><tbody>" + rows + "</tbody></table>"
            + nonPayableSection
            + "<table style=\"width:100%;font-size:14px;margin-bottom:16px;\">"
            + "<tr><td style=\"color:#636566;padding:2px 0;\">Tạm tính</td><td style=\"padding:2px 0;text-align:right;\">" + money(subtotal) + "</td></tr>"
            + "<tr><td style=\"color:#636566;padding:2px 0;\">Giảm giá</td><td style=\"padding:2px 0;text-align:right;\">" + money(discountAmount) + "</td></tr>"
            + "<tr><td style=\"padding:8px 0;font-weight:700;border-top:1px solid #202325;\">Tổng thanh toán</td><td style=\"padding:8px 0;text-align:right;font-weight:700;border-top:1px solid #202325;\">" + money(totalAmount) + "</td></tr>"
            + "</table>"
            + "<table style=\"width:100%;font-size:14px;margin-bottom:20px;\">"
            + "<tr><td style=\"color:#636566;padding:6px 0;\">Trạng thái</td><td style=\"padding:6px 0;font-weight:600;\">" + statusLabel + "</td></tr>"
            + methodRow
            + "</table>"
            + "<p style=\"font-size:13px;color:#202325;\">Cảm ơn quý khách đã dùng bữa tại " + RESTAURANT_NAME + ". Hẹn gặp lại!</p>"
            + "<p style=\"font-size:11px;color:#a2a4a4;margin-top:20px;\">Đây là email hóa đơn được gửi tự động từ hệ thống, vui lòng không trả lời email này.</p>"
            + "</div>";
    }

    // ── ORM-02: Booking received, pending staff confirmation ──────────────────

    public void sendReservationPendingEmail(String toEmail, String guestName,
            LocalDateTime datetime, int partySize, String reservationId) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(toEmail);
        msg.setSubject("[Wasabi Restaurant] Yêu cầu đặt bàn đã được tiếp nhận");
        msg.setText(
            "Xin chào " + guestName + ",\n\n" +
            "Chúng tôi đã nhận được yêu cầu đặt bàn của bạn.\n\n" +
            "Chi tiết:\n" +
            "  - Mã đặt bàn : " + reservationId + "\n" +
            "  - Thời gian  : " + datetime.format(DATETIME_FORMATTER) + "\n" +
            "  - Số khách   : " + partySize + " người\n\n" +
            "Nhân viên sẽ liên hệ qua điện thoại để xác nhận trong thời gian sớm nhất.\n" +
            "Sau khi xác nhận, bạn sẽ nhận được email thông báo.\n\n" +
            "Nếu bạn cần thay đổi, vui lòng liên hệ nhà hàng trực tiếp.\n\n" +
            "Trân trọng,\nWasabi Restaurant"
        );
        mailSender.send(msg);
    }

    // ── ORM-03: Cancel OTP ────────────────────────────────────────────────────

    public void sendCancelOtpEmail(String toEmail, String guestName, String otp) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(toEmail);
        msg.setSubject("[Wasabi Restaurant] Mã xác nhận huỷ đặt bàn");
        msg.setText(
            "Xin chào " + guestName + ",\n\n" +
            "Bạn đã yêu cầu huỷ đặt bàn tại Wasabi Restaurant.\n\n" +
            "Mã OTP xác nhận huỷ: " + otp + "\n\n" +
            "Mã có hiệu lực trong 10 phút.\n" +
            "Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email và liên hệ nhà hàng ngay.\n\n" +
            "Trân trọng,\nWasabi Restaurant"
        );
        mailSender.send(msg);
    }

    // ── NM-04: Manual email ───────────────────────────────────────────────────

    public void sendManualEmail(String toEmail, String message) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(toEmail);
        msg.setSubject("Thông báo từ Wasabi Restaurant");
        msg.setText(message + "\n\nTrân trọng,\nWasabi Restaurant");
        mailSender.send(msg);
    }

    private static final DateTimeFormatter DATETIME_FORMATTER =
            DateTimeFormatter.ofPattern("HH:mm, dd/MM/yyyy");
}
