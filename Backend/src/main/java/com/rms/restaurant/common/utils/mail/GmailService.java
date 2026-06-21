package com.rms.restaurant.common.utils.mail;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class GmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@rms.com}")
    private String fromAddress;

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
            "  - Mã đặt bàn : " + reservationId + "\n" +
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
