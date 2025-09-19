package com.example.web_service.dto;

import lombok.Data;

import java.util.List;

@Data
public class SystemInfoDto {
    private CpuInfo cpu;
    private MemoryInfo memory;
    private List<DiskInfo> disks; // 改为支持多个磁盘
    private NetworkInfo network;
    private SystemDetails system;

    @Data
    public static class CpuInfo {
        private double usage;
        private int cores;
        private String model;
    }

    @Data
    public static class MemoryInfo {
        private double usage;
        private double total;
        private double used;
        private double free;
    }

    @Data
    public static class DiskInfo {
        private String name; // 磁盘名称或挂载点
        private String mountPoint; // 挂载点
        private double usage;
        private double total;
        private double used;
        private double free;
    }

    @Data
    public static class NetworkInfo {
        private List<NetworkInterface> interfaces;
    }

    @Data
    public static class NetworkInterface {
        private String name;
        private String address;
        private String netmask;
        private String family;
        private String mac;
        private boolean internal;
    }

    @Data
    public static class SystemDetails {
        private String hostname;
        private String platform;
        private String release;
        private long uptime;
    }
}
