package com.example.web_service.service;

import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.WebDriverWait;
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
import org.apache.commons.io.FileUtils;

@Service
public class PdfGeneratorService {
    
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
            return FileUtils.readFileToByteArray(pdfFile);
            
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
} 