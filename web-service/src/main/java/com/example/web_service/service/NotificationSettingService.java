package com.example.web_service.service;

import com.example.web_service.entity.NotificationSetting;
import com.example.web_service.repository.NotificationSettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Properties;
import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.net.Socket;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.io.OutputStream;

@Service
public class NotificationSettingService {
    
    @Autowired
    private NotificationSettingRepository notificationSettingRepository;

    public List<NotificationSetting> findAll() {
        return notificationSettingRepository.findAll();
    }

    public NotificationSetting findById(Long id) {
        return notificationSettingRepository.findById(id).orElse(null);
    }

    public NotificationSetting save(NotificationSetting notificationSetting) {
        if (notificationSetting.getId() != null) {
            // 如果是更新操作，获取原有记录的创建时间
            NotificationSetting existingSetting = notificationSettingRepository.findById(notificationSetting.getId()).orElse(null);
            if (existingSetting != null) {
                notificationSetting.setCreatedAt(existingSetting.getCreatedAt());
            }
        }
        return notificationSettingRepository.save(notificationSetting);
    }

    public void deleteById(Long id) {
        notificationSettingRepository.deleteById(id);
    }

    public List<NotificationSetting> search(String keyword) {
        return notificationSettingRepository.search(keyword);
    }

    public boolean testNotification(NotificationSetting setting) {
        try {
            if ("email".equals(setting.getService())) {
                // 测试邮件发送
                Properties props = new Properties();
                props.put("mail.smtp.host", setting.getMailServer());
                props.put("mail.smtp.port", setting.getEmailPort());
                props.put("mail.smtp.auth", "true");
                
                if ("ssl".equals(setting.getSecurity())) {
                    props.put("mail.smtp.ssl.enable", "true");
                    props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
                } else if ("tls".equals(setting.getSecurity())) {
                    props.put("mail.smtp.starttls.enable", "true");
                }
                
                Session session = Session.getInstance(props, new Authenticator() {
                    @Override
                    protected PasswordAuthentication getPasswordAuthentication() {
                        return new PasswordAuthentication(setting.getAccountName(), setting.getPassword());
                    }
                });

                Message message = new MimeMessage(session);
                message.setFrom(new InternetAddress(setting.getSender()));
                message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(setting.getReceiver()));
                message.setSubject("Test Email");
                message.setText("This is a test email from the system.");
                
                Transport.send(message);
                return true;
            } else if ("syslog".equals(setting.getService())) {
                // 测试Syslog连接并发送测试数据
                try (Socket socket = new Socket(setting.getHost(), Integer.parseInt(setting.getSyslogPort()))) {
                    if (socket.isConnected()) {
                        // 构造Syslog测试消息
                        // RFC 3164格式: <PRI>TIMESTAMP HOSTNAME TAG: MESSAGE
                        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMM dd HH:mm:ss"));
                        String hostname = InetAddress.getLocalHost().getHostName();
                        String testMessage = String.format("<%d>%s %s TestMessage: This is a test message from security system\n",
                                13, // priority = facility(1) * 8 + severity(5)
                                timestamp,
                                hostname
                        );

                        // 发送测试消息
                        OutputStream out = socket.getOutputStream();
                        out.write(testMessage.getBytes(StandardCharsets.UTF_8));
                        out.flush();
                        
                        return true;
                    }
                }
            }
            return false;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Send a notification using the provided setting. Supports email and syslog.
     */
    public void sendNotification(NotificationSetting setting, String subject, String content) throws Exception {
        if (setting == null || setting.getService() == null) {
            throw new IllegalArgumentException("Invalid notification setting");
        }
        if ("email".equalsIgnoreCase(setting.getService())) {
            Properties props = new Properties();
            props.put("mail.smtp.host", setting.getMailServer());
            props.put("mail.smtp.port", setting.getEmailPort());
            props.put("mail.smtp.auth", "true");
            if ("ssl".equalsIgnoreCase(setting.getSecurity())) {
                props.put("mail.smtp.ssl.enable", "true");
                props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
            } else if ("tls".equalsIgnoreCase(setting.getSecurity())) {
                props.put("mail.smtp.starttls.enable", "true");
            }
            Session session = Session.getInstance(props, new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(setting.getAccountName(), setting.getPassword());
                }
            });
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(setting.getSender()));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(setting.getReceiver()));
            message.setSubject(subject != null ? subject : (setting.getSubject() != null ? setting.getSubject() : "Notification"));
            message.setText(content != null ? content : "");
            Transport.send(message);
        } else if ("syslog".equalsIgnoreCase(setting.getService())) {
            try (Socket socket = new Socket(setting.getHost(), Integer.parseInt(setting.getSyslogPort()))) {
                String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMM dd HH:mm:ss"));
                String hostname = InetAddress.getLocalHost().getHostName();
                String tag = (setting.getSubject() != null && !setting.getSubject().isBlank()) ? setting.getSubject() : "Notification";
                String payload = (content != null ? content : "").replaceAll("\r?\n", " ");
                String msg = String.format("<%d>%s %s %s: %s\n", 13, timestamp, hostname, tag, payload);
                OutputStream out = socket.getOutputStream();
                out.write(msg.getBytes(StandardCharsets.UTF_8));
                out.flush();
            }
        } else {
            throw new UnsupportedOperationException("Unsupported notification service: " + setting.getService());
        }
    }
}