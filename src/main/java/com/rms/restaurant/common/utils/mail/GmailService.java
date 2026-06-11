package com.rms.restaurant.common.utils.mail;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

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
}
