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
            // 获取所有非lo的网络接口
            String command = "ip -o link show | grep -v 'lo:' | cut -d':' -f2 | tr -d ' '";
            logger.debug("Executing command to get network interfaces: {}", command);
            
            ProcessBuilder pb = new ProcessBuilder("bash", "-c", command);
            Process process = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            
            String line;
            List<String> networkInterfaces = new ArrayList<>();
            
            while ((line = reader.readLine()) != null) {
                networkInterfaces.add(line.trim());
                logger.debug("Found network interface: {}", line.trim());
            }
            reader.close();
            process.waitFor();
            
            logger.info("Found {} network interfaces: {}", networkInterfaces.size(), networkInterfaces);

            // 然后获取这些网卡的详细信息
            logger.debug("Executing 'ip addr' to get interface details");
            pb = new ProcessBuilder("ip", "addr");
            process = pb.start();
            reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            
            NetworkInterface currentInterface = null;
            Pattern interfacePattern = Pattern.compile("^\\d+: ([^:]+):");
            Pattern ipPattern = Pattern.compile("\\s+inet (\\d+\\.\\d+\\.\\d+\\.\\d+)/(\\d+)");
            
            while ((line = reader.readLine()) != null) {
                logger.trace("Processing line: {}", line);
                Matcher interfaceMatcher = interfacePattern.matcher(line);
                if (interfaceMatcher.find()) {
                    String ifaceName = interfaceMatcher.group(1);
                    logger.debug("Found interface in ip addr output: {}", ifaceName);
                    if (networkInterfaces.contains(ifaceName)) {
                        if (currentInterface != null) {
                            interfaces.add(currentInterface);
                            logger.debug("Added interface to list: {}", currentInterface);
                        }
                        currentInterface = new NetworkInterface();
                        currentInterface.setInterface_name(ifaceName);
                        String method = getInterfaceMethod(ifaceName);
                        currentInterface.setMethod(method);
                        logger.debug("Created new interface object for {}, method: {}", ifaceName, method);
                    } else {
                        logger.debug("Skipping interface {} as it's not in our target list", ifaceName);
                        currentInterface = null;
                    }
                }
                
                if (currentInterface != null) {
                    Matcher ipMatcher = ipPattern.matcher(line);
                    if (ipMatcher.find()) {
                        String ipAddress = ipMatcher.group(1);
                        int cidr = Integer.parseInt(ipMatcher.group(2));
                        String netmask = convertCIDRToNetmask(cidr);
                        String gateway = getGateway(currentInterface.getInterface_name());
                        
                        currentInterface.setIp_address(ipAddress);
                        currentInterface.setNetmask(netmask);
                        currentInterface.setGateway(gateway);
                        
                        logger.debug("Interface {} details - IP: {}, Netmask: {}, Gateway: {}", 
                            currentInterface.getInterface_name(), ipAddress, netmask, gateway);
                    }
                }
            }
            
            if (currentInterface != null) {
                interfaces.add(currentInterface);
                logger.debug("Added final interface to list: {}", currentInterface);
            }
            
            reader.close();
            process.waitFor();
            
            logger.info("Successfully found {} network interfaces", interfaces.size());
            
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