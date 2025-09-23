import { log } from "console";

/**
 * 时间间隔计算工具类
 * 提供根据时间跨度自动计算最佳聚合间隔的功能
 */
export class TimeIntervalUtil {

  /**
   * 根据时间跨度计算最接近目标点数的常用间隔（最小 1m，最大 1y）
   * @param spanMillis 时间跨度（毫秒）
   * @param desiredPoints 期望的数据点数，默认为20
   * @returns 时间间隔字符串，如 '1m', '5m', '1h', '1d' 等
   */
  static computeAutoInterval(spanMillis: number, desiredPoints: number = 20): string {
    const safeSpan = Math.max(1, spanMillis);
    const targetBucketMs = Math.max(60_000, Math.floor(safeSpan / Math.max(1, desiredPoints)));

    const steps: number[] = [
      60_000,               // 1m
      5 * 60_000,           // 5m
      15 * 60_000,          // 15m
      30 * 60_000,          // 30m
      60 * 60_000,          // 1h
      3 * 60 * 60_000,      // 3h
      6 * 60 * 60_000,      // 6h
      12 * 60 * 60_000,     // 12h
      24 * 60 * 60_000,     // 1d
      3 * 24 * 60 * 60_000, // 3d
      7 * 24 * 60 * 60_000, // 7d
      14 * 24 * 60 * 60_000,// 14d
      30 * 24 * 60 * 60_000,// 30d
      90 * 24 * 60 * 60_000,// 90d
      180 * 24 * 60 * 60_000,// 180d
      365 * 24 * 60 * 60_000 // 1y
    ];

    const labels: string[] = ['1m','5m','15m','30m','1h','3h','6h','12h','1d','3d','7d','14d','30d','90d','180d','1y'];

    for (let i = 0; i < steps.length; i++) {
      if (steps[i] >= targetBucketMs) {
        return labels[i];
      }
    }

    return '1y';
  }
}
