package com.example.web_service.service;

import com.example.web_service.entity.ReportScheduler;
import com.example.web_service.entity.NotificationSetting;
import com.example.web_service.entity.Report;
import com.example.web_service.service.ReportSchedulerService;
import com.example.web_service.service.NotificationSettingService;
import com.example.web_service.service.PdfGeneratorService;
import com.example.web_service.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalTime;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;
import jakarta.mail.*;
import jakarta.mail.internet.*;
import jakarta.mail.util.ByteArrayDataSource;
import jakarta.activation.DataHandler;
import java.net.Socket;
import java.net.InetAddress;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@Service
public class ReportScheduleExecutorService {
    
    private static final Logger logger = LoggerFactory.getLogger(ReportScheduleExecutorService.class);
    
    // 用于记录最后执行时间，避免重复执行
    private final Map<Long, LocalDateTime> lastExecutionTimes = new ConcurrentHashMap<>();
    
    @Autowired
    private ReportSchedulerService reportSchedulerService;
    
    @Autowired
    private NotificationSettingService notificationSettingService;
    
    @Autowired
    private PdfGeneratorService pdfGeneratorService;
    
    @Autowired
    private ReportService reportService;
    
    @Value("${app.report.storage.path}")
    private String reportStoragePath;
    
    /**
     * 每分钟检查一次调度任务
     */
    @Scheduled(fixedRate = 60000) // 每分钟执行一次
    public void checkScheduledReports() {
        try {
            LocalDateTime now = LocalDateTime.now();
            List<ReportScheduler> activeSchedulers = reportSchedulerService.findAll()
                    .stream()
                    .filter(scheduler -> "Active".equals(scheduler.getStatus()) || "enabled".equals(scheduler.getStatus()))
                    .toList();
            
            logger.debug("Checking {} active schedulers at {}", activeSchedulers.size(), now);
            
            for (ReportScheduler scheduler : activeSchedulers) {
                if (shouldExecuteNow(scheduler, now)) {
                    logger.info("Executing scheduler: {} at {}", scheduler.getName(), now);
                    executeReport(scheduler);
                    
                    // 记录最后执行时间
                    lastExecutionTimes.put(scheduler.getId(), now);
                }
            }
        } catch (Exception e) {
            logger.error("Error during scheduled report execution", e);
        }
    }
    
    /**
     * 手动执行调度器
     */
    public void executeSchedulerManually(ReportScheduler scheduler) {
        try {
            logger.info("Manually executing scheduler: {}", scheduler.getName());
            executeReport(scheduler);
            logger.info("Manual execution completed for scheduler: {}", scheduler.getName());
        } catch (Exception e) {
            logger.error("Error in manual execution for scheduler: {}", scheduler.getName(), e);
            throw new RuntimeException("Failed to execute scheduler: " + e.getMessage(), e);
        }
    }
    
    /**
     * 判断调度任务是否应该在当前时间执行
     */
    private boolean shouldExecuteNow(ReportScheduler scheduler, LocalDateTime now) {
        LocalTime scheduledTime = scheduler.getTime();
        LocalTime currentTime = now.toLocalTime();
        
        // 检查是否在执行时间窗口内（允许1分钟的误差）
        if (Math.abs(currentTime.toSecondOfDay() - scheduledTime.toSecondOfDay()) > 60) {
            return false;
        }
        
        // 检查最后执行时间，避免重复执行
        LocalDateTime lastExecution = lastExecutionTimes.get(scheduler.getId());
        if (lastExecution != null) {
            // 如果最后执行时间在今天，则检查是否应该再次执行
            switch (scheduler.getFrequency()) {
                case "Daily":
                    // 每天执行一次，如果今天已经执行过则跳过
                    if (lastExecution.toLocalDate().equals(now.toLocalDate())) {
                        return false;
                    }
                    break;
                case "Weekly":
                    // 每周执行一次，如果本周已经执行过则跳过
                    if (lastExecution.isAfter(now.minusDays(7))) {
                        return false;
                    }
                    break;
                case "Monthly":
                    // 每月执行一次，如果本月已经执行过则跳过
                    if (lastExecution.isAfter(now.minusDays(30))) {
                        return false;
                    }
                    break;
            }
        }
        
        return true;
    }
    
    /**
     * 执行报告生成和发送
     */
    private void executeReport(ReportScheduler scheduler) {
        try {
            logger.info("Starting report execution for scheduler: {}", scheduler.getName());
            
            // 根据频率计算时间范围
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime startTime;
            
            switch (scheduler.getFrequency()) {
                case "Daily":
                    startTime = now.minusDays(1);
                    break;
                case "Weekly":
                    startTime = now.minusDays(7);
                    break;
                case "Monthly":
                    startTime = now.minusDays(30);
                    break;
                default:
                    startTime = now.minusDays(7); // 默认7天
            }
            
            long startTimeMillis = startTime.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
            long endTimeMillis = now.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
            
            // 生成PDF报告
            byte[] pdfContent = generatePdfReport(scheduler, startTimeMillis, endTimeMillis);
            
            // 保存报告文件
            String fileName = String.format("%s_%s_%s.pdf", 
                scheduler.getName().replaceAll("[^a-zA-Z0-9]", "_"),
                scheduler.getFrequency(),
                now.format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"))
            );
            
            savePdfReport(scheduler, pdfContent, fileName);
            
            // 发送报告
            sendReportWithAttachment(scheduler, pdfContent, fileName);
            
            logger.info("Report execution completed successfully for scheduler: {}", scheduler.getName());
            
        } catch (Exception e) {
            logger.error("Error executing report for scheduler: {}", scheduler.getName(), e);
            throw new RuntimeException("Failed to execute report: " + e.getMessage(), e);
        }
    }
    
    /**
     * 根据模板生成PDF报告（带时间范围）
     */
    private byte[] generatePdfReport(ReportScheduler scheduler, long startTimeMillis, long endTimeMillis) throws Exception {
        // 解析模板ID
        Long templateId = parseTemplateId(scheduler.getTemplate());
        
        if (templateId != null) {
            try {
                // 使用带时间范围的PDF生成服务，传入时间参数给前端页面
                logger.info("Generating PDF from template ID: {} with time range for scheduler: {}", templateId, scheduler.getName());
                logger.info("Time range: {} to {}", 
                    java.time.Instant.ofEpochMilli(startTimeMillis),
                    java.time.Instant.ofEpochMilli(endTimeMillis));
                
                // 使用带时间范围的PDF生成方法
                return pdfGeneratorService.generatePdfFromTemplateWithTimeRange(templateId, startTimeMillis, endTimeMillis);
                
            } catch (Exception e) {
                logger.warn("Failed to generate PDF from template ID {} with time range, falling back to default PDF generation: {}", 
                           templateId, e.getMessage());
                // 如果模板生成失败，回退到默认生成方式
                return generateDefaultPdfReport(scheduler, startTimeMillis, endTimeMillis);
            }
        } else {
            // 如果无法解析模板ID，生成默认PDF报告
            logger.info("No valid template ID found for '{}', using default PDF generation for scheduler: {}", 
                       scheduler.getTemplate(), scheduler.getName());
            return generateDefaultPdfReport(scheduler, startTimeMillis, endTimeMillis);
        }
    }
    
    /**
     * 解析模板ID
     */
    private Long parseTemplateId(String template) {
        // 如果template是数字，则作为模板ID使用
        try {
            return Long.parseLong(template);
        } catch (NumberFormatException e) {
            // 如果不是数字，可能是模板名称，需要转换为ID
            // 这里可以根据实际业务逻辑进行映射
            switch (template) {
                case "Security Dashboard":
                    return 1L;
                case "System Status Template":
                case "系统状态模板":
                    return 2L;
                case "Security Alert Template":
                case "安全警报模板":
                    return 3L;
                default:
                    return null; // 使用默认生成方式
            }
        }
    }
    
    /**
     * 生成默认PDF报告（当模板不可用时的后备方案）
     */
    private byte[] generateDefaultPdfReport(ReportScheduler scheduler, long startTimeMillis, long endTimeMillis) throws Exception {
        logger.warn("Using fallback PDF generation for scheduler: {} with template: {}", 
                   scheduler.getName(), scheduler.getTemplate());
        
        // 生成详细的报告内容
        String content = String.format(
            "调度报告: %s\n\n" +
            "模板: %s\n" +
            "频率: %s\n" +
            "描述: %s\n" +
            "生成时间: %s\n" +
            "时间范围: %s 至 %s\n\n" +
            "注意: 由于指定的模板不可用，此报告为后备方案生成。\n" +
            "请检查系统中的模板配置。",
            scheduler.getName(),
            scheduler.getTemplate(),
            scheduler.getFrequency(),
            scheduler.getDescription(),
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
            LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(startTimeMillis), java.time.ZoneId.systemDefault())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
            LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(endTimeMillis), java.time.ZoneId.systemDefault())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        );
        
        // 使用PdfGeneratorService的文本转PDF方法生成真正的PDF
        try {
            return pdfGeneratorService.generatePdfFromText(content, "调度报告 - " + scheduler.getName());
        } catch (Exception e) {
            logger.error("Failed to generate PDF from text, using simple text fallback", e);
            // 最后的后备方案：返回简单的文本内容
            return content.getBytes(StandardCharsets.UTF_8);
        }
    }
    
    /**
     * 保存PDF报告到数据库和文件系统
     */
    private Report savePdfReport(ReportScheduler scheduler, byte[] pdfContent, String fileName) throws Exception {
        // 确保存储目录存在
        java.nio.file.Path storageDir = java.nio.file.Paths.get(reportStoragePath);
        if (!java.nio.file.Files.exists(storageDir)) {
            java.nio.file.Files.createDirectories(storageDir);
            logger.info("Created report storage directory: {}", reportStoragePath);
        }
        
        // 保存PDF文件到本地文件系统
        String filePath = reportStoragePath + "/" + fileName;
        java.nio.file.Path pdfPath = java.nio.file.Paths.get(filePath);
        java.nio.file.Files.write(pdfPath, pdfContent);
        
        logger.info("PDF report saved to local file: {} (size: {} bytes)", filePath, pdfContent.length);
        
        // 保存记录到数据库
        Report report = new Report();
        report.setName(scheduler.getName() + " - " + scheduler.getFrequency() + " Report");
        report.setDescription("Scheduled report generated from template: " + scheduler.getTemplate());
        report.setTemplateId(parseTemplateId(scheduler.getTemplate()));
        report.setFilePath(filePath);
        report.setTriggerMode("Scheduled");
        report.setCreator("System Scheduler");
        report.setCreatedAt(LocalDateTime.now());
        
        Report savedReport = reportService.save(report);
        logger.info("Report record saved to database with ID: {}", savedReport.getId());
        
        return savedReport;
    }
    
    /**
     * 发送报告附件
     */
    private void sendReportWithAttachment(ReportScheduler scheduler, byte[] pdfContent, String fileName) {
        String whereToSend = scheduler.getWhereToSend();
        
        if (whereToSend.contains("@")) {
            // 邮件发送 - 使用本地生成的PDF文件
            logger.info("Sending PDF attachment via email to: {} for scheduler: {}", whereToSend, scheduler.getName());
            sendEmailWithAttachment(whereToSend, scheduler, pdfContent, fileName);
        } else if (whereToSend.contains(":")) {
            // Syslog发送 - 注意：Syslog不支持附件，这里记录日志
            logger.info("Syslog does not support attachments. Report generated: {} for scheduler: {}", fileName, scheduler.getName());
            sendSyslogReport(whereToSend, scheduler, "PDF report generated: " + fileName);
        } else {
            logger.warn("Unknown destination format: {} for scheduler: {}", whereToSend, scheduler.getName());
        }
    }
    
    /**
     * 发送邮件附件
     */
    private void sendEmailWithAttachment(String email, ReportScheduler scheduler, byte[] pdfContent, String fileName) {
        try {
            // 查找对应的邮件配置
            List<NotificationSetting> emailSettings = notificationSettingService.findAll()
                .stream()
                .filter(setting -> "email".equals(setting.getService()) && email.equals(setting.getReceiver()))
                .toList();
            
            if (emailSettings.isEmpty()) {
                logger.warn("No email configuration found for: {}", email);
                return;
            }
            
            NotificationSetting emailSetting = emailSettings.get(0);
            sendEmailWithAttachment(email, scheduler, pdfContent, fileName, emailSetting);
            
        } catch (Exception e) {
            logger.error("Error sending email with attachment to: {} for scheduler: {}", email, scheduler.getName(), e);
        }
    }
    
    /**
     * 发送邮件附件（具体实现）
     */
    private void sendEmailWithAttachment(String email, ReportScheduler scheduler, byte[] pdfContent, String fileName, NotificationSetting emailSetting) {
        try {
            // 配置邮件属性 - 参考成功的 /notifications/test 接口实现
            Properties props = new Properties();
            props.put("mail.smtp.host", emailSetting.getMailServer());
            props.put("mail.smtp.port", emailSetting.getEmailPort());
            props.put("mail.smtp.auth", "true");
            
            // 增加超时时间
            props.put("mail.smtp.connectiontimeout", "30000"); // 30秒连接超时
            props.put("mail.smtp.timeout", "30000"); // 30秒读取超时
            props.put("mail.smtp.writetimeout", "30000"); // 30秒写入超时
            
            // 使用security字段来配置SSL/TLS，修正SSL工厂类名
            if ("ssl".equals(emailSetting.getSecurity())) {
                props.put("mail.smtp.ssl.enable", "true");
                props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory"); // 使用正确的类名
                props.put("mail.smtp.socketFactory.port", emailSetting.getEmailPort());
                props.put("mail.smtp.socketFactory.fallback", "false");
            } else if ("tls".equals(emailSetting.getSecurity())) {
                props.put("mail.smtp.starttls.enable", "true");
                props.put("mail.smtp.starttls.required", "false"); // 不强制要求，增加兼容性
            }
            
            // 调试模式（可选，用于排查问题）
            // props.put("mail.debug", "true");
            
            // 添加调试信息
            logger.debug("Attempting to send email to {} using SMTP server {}:{}", email, emailSetting.getMailServer(), emailSetting.getEmailPort());
            
            // 创建会话
            Session session = Session.getInstance(props, new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(emailSetting.getAccountName(), emailSetting.getPassword());
                }
            });
            
            // 创建邮件
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(emailSetting.getSender()));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(email));
            message.setSubject("[Scheduled Report] " + scheduler.getName());
            
            // 创建多部分内容
            Multipart multipart = new MimeMultipart();
            
            // 添加邮件正文
            BodyPart messageBodyPart = new MimeBodyPart();
            String emailBody = String.format(
                "<h2>Scheduled Report: %s</h2>" +
                "<p><strong>Description:</strong> %s</p>" +
                "<p><strong>Template:</strong> %s</p>" +
                "<p><strong>Frequency:</strong> %s</p>" +
                "<p><strong>Generated at:</strong> %s</p>" +
                "<p><strong>File name:</strong> %s</p>" +
                "<p>Please find the attached PDF report generated from template.</p>" +
                "<p><em>Note: This report was generated using the same PDF export functionality as templates/%s/export-pdf</em></p>" +
                "<br><p>Best regards,<br>Security System Scheduler</p>",
                scheduler.getName(),
                scheduler.getDescription(),
                scheduler.getTemplate(),
                scheduler.getFrequency(),
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                fileName,
                parseTemplateId(scheduler.getTemplate())
            );
            messageBodyPart.setContent(emailBody, "text/html; charset=utf-8");
            multipart.addBodyPart(messageBodyPart);
            
            // 添加PDF附件
            BodyPart attachmentPart = new MimeBodyPart();
            ByteArrayDataSource dataSource = new ByteArrayDataSource(pdfContent, "application/pdf");
            attachmentPart.setDataHandler(new DataHandler(dataSource));
            attachmentPart.setFileName(fileName);
            multipart.addBodyPart(attachmentPart);
            
            // 设置邮件内容
            message.setContent(multipart);
            message.setSentDate(new java.util.Date());
            
            // 发送邮件
            Transport.send(message);
            logger.info("Email with PDF attachment sent successfully to: {} for scheduler: {}", email, scheduler.getName());
            
        } catch (Exception e) {
            // 邮件发送失败不应该影响报告生成的成功状态
            String errorMsg = e.getMessage();
            if (e instanceof jakarta.mail.MessagingException) {
                jakarta.mail.MessagingException me = (jakarta.mail.MessagingException) e;
                if (me.getCause() instanceof java.net.SocketTimeoutException) {
                    errorMsg = "Network timeout - SMTP server may be slow or unreachable";
                } else if (me.getCause() instanceof java.net.ConnectException) {
                    errorMsg = "Connection refused - Check SMTP server and port";
                } else if (errorMsg.contains("authentication")) {
                    errorMsg = "Authentication failed - Check username/password and enable SMTP for the email account";
                }
            }
            
            logger.warn("Failed to send email to: {} for scheduler: {}. Report was generated successfully but email delivery failed: {}", 
                       email, scheduler.getName(), errorMsg);
            logger.debug("Email sending error details:", e);
            
            // 可以考虑将失败的邮件任务放入重试队列
            // scheduleEmailRetry(email, scheduler, pdfContent, fileName, emailSetting);
            
            // 记录邮件发送失败的统计信息（可选）
            logger.info("Email delivery failed but PDF report was successfully generated and saved for scheduler: {}", scheduler.getName());
        }
    }
    
    /**
     * 发送Syslog报告
     */
    private void sendSyslogReport(String syslogEndpoint, ReportScheduler scheduler, String content) {
        try {
            String[] parts = syslogEndpoint.split(":");
            if (parts.length != 2) {
                logger.warn("Invalid syslog endpoint format: {}", syslogEndpoint);
                return;
            }
            
            String host = parts[0];
            int port = Integer.parseInt(parts[1]);
            
            try (Socket socket = new Socket(host, port)) {
                OutputStream outputStream = socket.getOutputStream();
                
                // 构造Syslog消息 (RFC 3164格式)
                String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMM dd HH:mm:ss"));
                String hostname = InetAddress.getLocalHost().getHostName();
                
                // 格式化报告内容，将换行符替换为空格
                String formattedContent = content.replaceAll("\\r?\\n", " ");
                
                String syslogMessage = String.format("<%d>%s %s ScheduledReport[%d]: %s - %s\n",
                    16, // facility=user(1), severity=info(6) -> 1*8+6=14, 但这里用16
                    timestamp,
                    hostname,
                    scheduler.getId(),
                    scheduler.getName(),
                    formattedContent
                );
                
                outputStream.write(syslogMessage.getBytes(StandardCharsets.UTF_8));
                outputStream.flush();
                
                logger.info("Syslog report sent successfully to: {} for scheduler: {}", syslogEndpoint, scheduler.getName());
            }
            
        } catch (Exception e) {
            logger.error("Error sending syslog report to: {} for scheduler: {}", syslogEndpoint, scheduler.getName(), e);
        }
    }
}