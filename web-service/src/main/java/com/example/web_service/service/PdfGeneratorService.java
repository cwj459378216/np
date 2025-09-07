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
        WebDriver driver = null;
        File screenshot = null;
        File pdfFile = null;
        
        try {
            // 配置 Chrome
            ChromeOptions options = new ChromeOptions();
            options.addArguments("--headless");  // 无头模式
            options.addArguments("--no-sandbox");
            options.addArguments("--disable-dev-shm-usage");
            options.addArguments("--window-size=1920,1080");
            
            // 初始化 WebDriver
            driver = new ChromeDriver(options);
            
            // 访问预览页面
            String url = frontendUrl + "/standalone/preview/" + templateId;
            driver.get(url);
            
            // 等待页面加载完成（等待 gridster 元素出现）
            new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(d -> d.findElement(By.tagName("gridster")));
            
            // 额外等待确保图表渲染完成
            Thread.sleep(2000);
            
            // 创建临���文件
            screenshot = File.createTempFile("template_", ".png");
            pdfFile = File.createTempFile("template_", ".pdf");
            
            // 截图
            File screenshotFile = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
            FileUtils.copyFile(screenshotFile, screenshot);
            
            // 创建PDF
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
            
            // 读取生成的PDF
            byte[] pdfContent = FileUtils.readFileToByteArray(pdfFile);
            
            // 保存 PDF 文件
            String fileName = String.format("template_%d_%s.pdf", 
                templateId, 
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")));
            String filePath = reportStoragePath + "/" + fileName;
            FileUtils.writeByteArrayToFile(new File(filePath), pdfContent);
            
            // 创建报告记录
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
            
            return pdfContent;
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF", e);
        } finally {
            // 清理资源
            if (driver != null) {
                driver.quit();
            }
            if (screenshot != null) {
                screenshot.delete();
            }
            if (pdfFile != null) {
                pdfFile.delete();
            }
        }
    }
    
    /**
     * 生成带时间范围的模板PDF
     */
    public byte[] generatePdfFromTemplateWithTimeRange(Long templateId, long startTimeMillis, long endTimeMillis) throws IOException {
        WebDriver driver = null;
        File screenshot = null;
        File pdfFile = null;
        
        try {
            // 配置 Chrome
            ChromeOptions options = new ChromeOptions();
            options.addArguments("--headless");  // 无头模式
            options.addArguments("--no-sandbox");
            options.addArguments("--disable-dev-shm-usage");
            options.addArguments("--window-size=1920,1080");
            
            // 初始化 WebDriver
            driver = new ChromeDriver(options);
            
            // 访问预览页面，带时间范围参数
            String url = String.format("%s/standalone/preview/%d?startTime=%d&endTime=%d", 
                frontendUrl, templateId, startTimeMillis, endTimeMillis);
            driver.get(url);
            
            // 等待页面加载完成
            new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(d -> d.findElement(By.tagName("gridster")));
            
            // 额外等待确保图表渲染完成
            Thread.sleep(2000);
            
            // 创建临时文件
            screenshot = File.createTempFile("template_", ".png");
            pdfFile = File.createTempFile("template_", ".pdf");
            
            // 截图
            File screenshotFile = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
            FileUtils.copyFile(screenshotFile, screenshot);
            
            // 创建PDF
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
            
            // 读取生成的PDF
            return FileUtils.readFileToByteArray(pdfFile);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF with time range", e);
        } finally {
            // 清理资源
            if (driver != null) {
                driver.quit();
            }
            if (screenshot != null) {
                screenshot.delete();
            }
            if (pdfFile != null) {
                pdfFile.delete();
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