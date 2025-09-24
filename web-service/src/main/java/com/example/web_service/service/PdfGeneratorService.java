package com.example.web_service.service;

import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Image;

import lombok.extern.slf4j.Slf4j;

import com.itextpdf.io.image.ImageDataFactory;
import java.io.File;
import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.apache.commons.io.FileUtils;
import com.example.web_service.entity.Report;
import com.example.web_service.entity.Template;

@Service
@Slf4j
public class PdfGeneratorService {
    
    @Autowired
    private ReportService reportService;
    
    @Autowired
    private TemplateService templateService;
    
    @Value("${app.report.storage.path}")
    private String reportStoragePath;
    
    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;
    
    public byte[] generatePdfFromTemplate(Long templateId) throws IOException {
        log.info("Starting PDF generation for template ID: {}", templateId);
        WebDriver driver = null;
        File screenshot = null;
        File pdfFile = null;
        
        try {
            // 设置 ChromeDriver 路径
            String chromeDriverPath = "/usr/local/bin/chromedriver";
            log.info("Setting ChromeDriver path: {}", chromeDriverPath);
            System.setProperty("webdriver.chrome.driver", chromeDriverPath);
            
            // 检查ChromeDriver文件是否存在
            File chromeDriverFile = new File(chromeDriverPath);
            if (!chromeDriverFile.exists()) {
                log.error("ChromeDriver not found at path: {}", chromeDriverPath);
                throw new RuntimeException("ChromeDriver not found at: " + chromeDriverPath);
            }
            if (!chromeDriverFile.canExecute()) {
                log.error("ChromeDriver is not executable at path: {}", chromeDriverPath);
                throw new RuntimeException("ChromeDriver is not executable at: " + chromeDriverPath);
            }
            log.info("ChromeDriver file validation successful: {}", chromeDriverPath);
            
            // 配置 Chrome
            log.info("Configuring Chrome options for template ID: {}", templateId);
            ChromeOptions options = new ChromeOptions();
            options.addArguments("--headless");  // 无头模式
            options.addArguments("--no-sandbox");
            options.addArguments("--disable-dev-shm-usage");
            options.addArguments("--window-size=1920,1080");
            log.info("Chrome options configured: headless, no-sandbox, disable-dev-shm-usage, window-size=1920x1080");
            
            // 初始化 WebDriver
            log.info("Initializing ChromeDriver...");
            driver = new ChromeDriver(options);
            log.info("ChromeDriver initialized successfully");
            
            // 访问预览页面
            String url = frontendUrl + "/standalone/preview/" + templateId;
            // Note: this method called without explicit time range; if future need arises to inherit
            // time params, a separate endpoint should pass them explicitly. Here we keep as-is.
            log.info("Navigating to preview URL: {}", url);
            driver.get(url);
            
            // 等待页面加载完成（等待 gridster 元素出现）
            log.info("Waiting for page to load (gridster element)...");
            new WebDriverWait(driver, Duration.ofSeconds(20))
                .until(d -> d.findElement(By.tagName("gridster")));
            log.info("Gridster element found, page loaded successfully");

            // 显式等待前端渲染完成标记
            log.info("Waiting for frontend rendering to complete...");
            new WebDriverWait(driver, Duration.ofSeconds(30)).until(d -> {
                try {
                    Object ready = ((JavascriptExecutor) d).executeScript("return window.__reportReady__ === true;");
                    return Boolean.TRUE.equals(ready);
                } catch (Exception e) {
                    return false;
                }
            });
            log.info("Frontend rendering completed successfully");
            // 检查是否存在错误标记
            try {
                Object hasError = ((JavascriptExecutor) driver).executeScript("return window.__reportError__ === true;");
                if (Boolean.TRUE.equals(hasError)) {
                    throw new RuntimeException("Frontend reported error while loading template");
                }
            } catch (WebDriverException ignored) { }
            
            // 创建临时文件
            screenshot = File.createTempFile("template_", ".png");
            pdfFile = File.createTempFile("template_", ".pdf");
            log.info("Created temporary files - screenshot: {}, pdf: {}", screenshot.getAbsolutePath(), pdfFile.getAbsolutePath());
            
            // 截图
            log.info("Taking screenshot...");
            File screenshotFile = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
            FileUtils.copyFile(screenshotFile, screenshot);
            log.info("Screenshot saved successfully to: {}", screenshot.getAbsolutePath());
            
            // 创建PDF
            log.info("Creating PDF document...");
            PdfWriter writer = new PdfWriter(pdfFile);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);
            
            // 添加截图到PDF
            Image image = new Image(ImageDataFactory.create(screenshot.getAbsolutePath()));
            
            // 调整图片大小以适应A4页面
            float pageWidth = pdf.getDefaultPageSize().getWidth() - 40;
            float pageHeight = pdf.getDefaultPageSize().getHeight() - 40;
            float imageWidth = image.getImageWidth();
            float imageHeight = image.getImageHeight();
            
            // 计算缩放比例
            float scale = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
            image.setWidth(imageWidth * scale);
            image.setHeight(imageHeight * scale);
            
            // 居中显示
            image.setHorizontalAlignment(com.itextpdf.layout.properties.HorizontalAlignment.CENTER);
            
            document.add(image);
            document.close();
            log.info("PDF document created successfully");
            
            // 读取生成的PDF
            byte[] pdfContent = FileUtils.readFileToByteArray(pdfFile);
            log.info("PDF content read, size: {} bytes", pdfContent.length);
            
            // 保存 PDF 文件
            String fileName = String.format("template_%d_%s.pdf", 
                templateId, 
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")));
            String filePath = reportStoragePath + "/" + fileName;
            FileUtils.writeByteArrayToFile(new File(filePath), pdfContent);
            log.info("PDF file saved to: {}", filePath);
            
            // 创建报告记录
            log.info("Creating report record for template ID: {}", templateId);
            Template template = templateService.findById(templateId);
            Report report = new Report();
            report.setName(template.getName() + " Report");
            report.setDescription("Generated from template: " + template.getName());
            report.setTemplateId(templateId);
            report.setFilePath(filePath);
            report.setTriggerMode("Manual");
            report.setCreator("System");
            report.setCreatedAt(LocalDateTime.now());  // 显式设置创建时间
            
            reportService.save(report);
            log.info("Report record saved successfully with ID: {}", report.getId());
            
            log.info("PDF generation completed successfully for template ID: {}", templateId);
            return pdfContent;
            
        } catch (Exception e) {
            log.error("Failed to generate PDF for template ID: {}", templateId, e);
            throw new RuntimeException("Failed to generate PDF", e);
        } finally {
            // 清理资源
            log.info("Cleaning up resources for template ID: {}", templateId);
            if (driver != null) {
                driver.quit();
                log.info("ChromeDriver closed");
            }
            if (screenshot != null) {
                boolean deleted = screenshot.delete();
                log.info("Screenshot temp file deleted: {}", deleted);
            }
            if (pdfFile != null) {
                boolean deleted = pdfFile.delete();
                log.info("PDF temp file deleted: {}", deleted);
            }
        }
    }
    
    /**
     * 生成带时间范围的模板PDF
     */
    public byte[] generatePdfFromTemplateWithTimeRange(Long templateId, long startTimeMillis, long endTimeMillis) throws IOException {
        log.info("Starting PDF generation with time range for template ID: {}, startTime: {}, endTime: {}", 
                templateId, startTimeMillis, endTimeMillis);
        WebDriver driver = null;
        File screenshot = null;
        File pdfFile = null;
        
        try {
            // 设置 ChromeDriver 路径
            String chromeDriverPath = "/usr/local/bin/chromedriver";
            log.info("Setting ChromeDriver path: {}", chromeDriverPath);
            System.setProperty("webdriver.chrome.driver", chromeDriverPath);
            
            // 检查ChromeDriver文件是否存在
            File chromeDriverFile = new File(chromeDriverPath);
            if (!chromeDriverFile.exists()) {
                log.error("ChromeDriver not found at path: {}", chromeDriverPath);
                throw new RuntimeException("ChromeDriver not found at: " + chromeDriverPath);
            }
            if (!chromeDriverFile.canExecute()) {
                log.error("ChromeDriver is not executable at path: {}", chromeDriverPath);
                throw new RuntimeException("ChromeDriver is not executable at: " + chromeDriverPath);
            }
            log.info("ChromeDriver file validation successful: {}", chromeDriverPath);
            
            // 配置 Chrome
            log.info("Configuring Chrome options for template ID: {}", templateId);
            ChromeOptions options = new ChromeOptions();
            options.addArguments("--headless");  // 无头模式
            options.addArguments("--no-sandbox");
            options.addArguments("--disable-dev-shm-usage");
            options.addArguments("--window-size=1920,1080");
            log.info("Chrome options configured: headless, no-sandbox, disable-dev-shm-usage, window-size=1920x1080");
            
            // 初始化 WebDriver
            log.info("Initializing ChromeDriver...");
            driver = new ChromeDriver(options);
            log.info("ChromeDriver initialized successfully");
            
            // 访问预览页面，带时间范围参数
            String url = String.format("%s/standalone/preview/%d?startTime=%d&endTime=%d", 
                frontendUrl, templateId, startTimeMillis, endTimeMillis);
            log.info("Navigating to preview URL with time range: {}", url);
            driver.get(url);
            
            // 等待页面加载完成
            log.info("Waiting for page to load (gridster element)...");
            new WebDriverWait(driver, Duration.ofSeconds(20))
                .until(d -> d.findElement(By.tagName("gridster")));
            log.info("Gridster element found, page loaded successfully");

            // 显式等待前端渲染完成标记
            new WebDriverWait(driver, Duration.ofSeconds(30)).until(d -> {
                try {
                    Object ready = ((JavascriptExecutor) d).executeScript("return window.__reportReady__ === true;");
                    return Boolean.TRUE.equals(ready);
                } catch (Exception e) {
                    return false;
                }
            });
            // 检查是否存在错误标记
            try {
                Object hasError = ((JavascriptExecutor) driver).executeScript("return window.__reportError__ === true;");
                if (Boolean.TRUE.equals(hasError)) {
                    throw new RuntimeException("Frontend reported error while loading template");
                }
            } catch (WebDriverException ignored) { }
            
            // 创建临时文件
            screenshot = File.createTempFile("template_", ".png");
            pdfFile = File.createTempFile("template_", ".pdf");
            log.info("Created temporary files - screenshot: {}, pdf: {}", screenshot.getAbsolutePath(), pdfFile.getAbsolutePath());
            
            // 截图
            log.info("Taking screenshot...");
            File screenshotFile = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
            FileUtils.copyFile(screenshotFile, screenshot);
            log.info("Screenshot saved successfully to: {}", screenshot.getAbsolutePath());
            
            // 创建PDF
            log.info("Creating PDF document...");
            PdfWriter writer = new PdfWriter(pdfFile);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);
            
            // 添加截图到PDF
            Image image = new Image(ImageDataFactory.create(screenshot.getAbsolutePath()));
            
            // 调整图片大小
            float pageWidth = pdf.getDefaultPageSize().getWidth() - 40;
            float pageHeight = pdf.getDefaultPageSize().getHeight() - 40;
            float imageWidth = image.getImageWidth();
            float imageHeight = image.getImageHeight();
            
            float scale = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
            image.setWidth(imageWidth * scale);
            image.setHeight(imageHeight * scale);
            image.setHorizontalAlignment(com.itextpdf.layout.properties.HorizontalAlignment.CENTER);
            
            document.add(image);
            document.close();
            log.info("PDF document created successfully");
            
            // 读取生成的PDF
            byte[] pdfContent = FileUtils.readFileToByteArray(pdfFile);
            log.info("PDF content read, size: {} bytes", pdfContent.length);
            log.info("PDF generation with time range completed successfully for template ID: {}", templateId);
            return pdfContent;
            
        } catch (Exception e) {
            log.error("Failed to generate PDF with time range for template ID: {}, startTime: {}, endTime: {}", 
                    templateId, startTimeMillis, endTimeMillis, e);
            throw new RuntimeException("Failed to generate PDF with time range", e);
        } finally {
            // 清理资源
            log.info("Cleaning up resources for template ID: {} with time range", templateId);
            if (driver != null) {
                driver.quit();
                log.info("ChromeDriver closed");
            }
            if (screenshot != null) {
                boolean deleted = screenshot.delete();
                log.info("Screenshot temp file deleted: {}", deleted);
            }
            if (pdfFile != null) {
                boolean deleted = pdfFile.delete();
                log.info("PDF temp file deleted: {}", deleted);
            }
        }
    }
    
    /**
     * 从文本内容生成PDF
     */
    public byte[] generatePdfFromText(String textContent, String title) throws IOException {
        File pdfFile = null;
        
        try {
            // 创建临时PDF文件
            pdfFile = File.createTempFile("text_report_", ".pdf");
            
            // 创建PDF
            PdfWriter writer = new PdfWriter(pdfFile);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);
            
            // 添加标题
            com.itextpdf.layout.element.Paragraph titleParagraph = 
                new com.itextpdf.layout.element.Paragraph(title)
                    .setFontSize(18)
                    .setBold()
                    .setMarginBottom(20);
            document.add(titleParagraph);
            
            // 添加内容
            com.itextpdf.layout.element.Paragraph contentParagraph = 
                new com.itextpdf.layout.element.Paragraph(textContent)
                    .setFontSize(12);
            document.add(contentParagraph);
            
            document.close();
            
            // 读取生成的PDF
            return FileUtils.readFileToByteArray(pdfFile);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF from text", e);
        } finally {
            // 清理资源
            if (pdfFile != null) {
                pdfFile.delete();
            }
        }
    }
}