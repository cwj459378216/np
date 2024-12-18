package com.example.web_service.service;

import com.example.web_service.entity.NetworkInterface;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class NetworkInterfaceService {
    
    private static final Logger logger = LoggerFactory.getLogger(NetworkInterfaceService.class);

    public List<NetworkInterface> findAll() {
        List<NetworkInterface> interfaces = new ArrayList<>();
        try {
            // 首先获取物理网卡列表
            ProcessBuilder pb = new ProcessBuilder("bash", "-c", "ls -l /sys/class/net/ | grep -v virtual");
            Process process = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            
            String line;
            Pattern physicalIfacePattern = Pattern.compile(".*/([^/]+)$");
            List<String> physicalInterfaces = new ArrayList<>();
            
            while ((line = reader.readLine()) != null) {
                Matcher matcher = physicalIfacePattern.matcher(line);
                if (matcher.find()) {
                    physicalInterfaces.add(matcher.group(1));
                }
            }
            reader.close();
            process.waitFor();

            // 然后获取这些物理网卡的详细信息
            pb = new ProcessBuilder("ip", "addr");
            process = pb.start();
            reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            
            NetworkInterface currentInterface = null;
            Pattern interfacePattern = Pattern.compile("^\\d+: ([^:]+):");
            Pattern ipPattern = Pattern.compile("\\s+inet (\\d+\\.\\d+\\.\\d+\\.\\d+)/(\\d+)");
            
            while ((line = reader.readLine()) != null) {
                Matcher interfaceMatcher = interfacePattern.matcher(line);
                if (interfaceMatcher.find()) {
                    String ifaceName = interfaceMatcher.group(1);
                    if (physicalInterfaces.contains(ifaceName)) {
                        if (currentInterface != null) {
                            interfaces.add(currentInterface);
                        }
                        currentInterface = new NetworkInterface();
                        currentInterface.setInterface_name(ifaceName);
                        currentInterface.setMethod(getInterfaceMethod(ifaceName));
                    } else {
                        currentInterface = null;
                    }
                }
                
                if (currentInterface != null) {
                    Matcher ipMatcher = ipPattern.matcher(line);
                    if (ipMatcher.find()) {
                        currentInterface.setIp_address(ipMatcher.group(1));
                        currentInterface.setNetmask(convertCIDRToNetmask(Integer.parseInt(ipMatcher.group(2))));
                        currentInterface.setGateway(getGateway(currentInterface.getInterface_name()));
                    }
                }
            }
            
            if (currentInterface != null) {
                interfaces.add(currentInterface);
            }
            
            reader.close();
            process.waitFor();
            
        } catch (Exception e) {
            logger.error("Error getting network interfaces: ", e);
            throw new RuntimeException("Failed to get network interfaces", e);
        }
        return interfaces;
    }

    public NetworkInterface findById(String interfaceName) {
        return findAll().stream()
                .filter(iface -> iface.getInterface_name().equals(interfaceName))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Network interface not found: " + interfaceName));
    }

    public NetworkInterface save(NetworkInterface networkInterface) {
        try {
            // 验证是否是物理网卡
            ProcessBuilder pb = new ProcessBuilder("ls", "-l", "/sys/class/net/" + networkInterface.getInterface_name());
            Process process = pb.start();
            if (process.waitFor() != 0) {
                throw new RuntimeException("Invalid network interface: " + networkInterface.getInterface_name());
            }

            String command;
            if ("DHCP".equalsIgnoreCase(networkInterface.getMethod())) {
                command = String.format(
                    "sudo sed -i '/^auto %1$s/,/^$/c\\auto %1$s\\niface %1$s inet dhcp' /etc/network/interfaces",
                    networkInterface.getInterface_name()
                );
            } else {
                command = String.format(
                    "sudo sed -i '/^auto %1$s/,/^$/c\\auto %1$s\\niface %1$s inet static\\naddress %2$s\\nnetmask %3$s\\ngateway %4$s' /etc/network/interfaces",
                    networkInterface.getInterface_name(),
                    networkInterface.getIp_address(),
                    networkInterface.getNetmask(),
                    networkInterface.getGateway()
                );
            }
            
            pb = new ProcessBuilder("bash", "-c", command);
            process = pb.start();
            process.waitFor();
            
            // 重启网络服务
            pb = new ProcessBuilder("sudo", "systemctl", "restart", "networking");
            process = pb.start();
            process.waitFor();
            
            return findById(networkInterface.getInterface_name());
        } catch (Exception e) {
            logger.error("Error saving network interface: ", e);
            throw new RuntimeException("Failed to save network interface", e);
        }
    }

    private String getInterfaceMethod(String interfaceName) {
        try {
            ProcessBuilder pb = new ProcessBuilder("bash", "-c", "grep -A 5 " + interfaceName + " /etc/network/interfaces");
            Process process = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.contains("dhcp")) {
                    return "DHCP";
                } else if (line.contains("static")) {
                    return "Static";
                }
            }
            process.waitFor();
            reader.close();
        } catch (Exception e) {
            logger.error("Error getting interface method: ", e);
        }
        return "Static"; // 默认返回Static
    }

    private String getGateway(String interfaceName) {
        try {
            ProcessBuilder pb = new ProcessBuilder("ip", "route", "show", "dev", interfaceName);
            Process process = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            Pattern gatewayPattern = Pattern.compile("default via (\\d+\\.\\d+\\.\\d+\\.\\d+)");
            
            while ((line = reader.readLine()) != null) {
                Matcher matcher = gatewayPattern.matcher(line);
                if (matcher.find()) {
                    return matcher.group(1);
                }
            }
            process.waitFor();
            reader.close();
        } catch (Exception e) {
            logger.error("Error getting gateway: ", e);
        }
        return null;
    }

    private String convertCIDRToNetmask(int cidr) {
        int bits = 0xffffffff ^ ((1 << (32 - cidr)) - 1);
        return String.format("%d.%d.%d.%d",
                (bits >> 24) & 0xff,
                (bits >> 16) & 0xff,
                (bits >> 8) & 0xff,
                bits & 0xff);
    }

    public List<NetworkInterface> search(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return findAll();
        }
        
        String searchTerm = keyword.toLowerCase().trim();
        return findAll().stream()
                .filter(iface -> 
                    iface.getInterface_name().toLowerCase().contains(searchTerm) ||
                    (iface.getIp_address() != null && 
                     iface.getIp_address().toLowerCase().contains(searchTerm)))
                .toList();
    }
} 