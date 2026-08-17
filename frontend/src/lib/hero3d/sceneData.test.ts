import { describe, expect, it } from 'vitest';
import { buildFlylines, buildNodeData, metricMax, rankCities } from './sceneData';
import type { MergedCity } from '../../hooks/useMetroData';
import type { MetricKey } from '../../types/metro';

function city(
  name: string,
  nameCn: string,
  daily: number,
  mileage: number,
): MergedCity {
  return {
    city: name,
    city_cn: nameCn,
    daily_ridership_wan: daily,
    operating_mileage_km: mileage,
    operating_stations: 100,
    operating_lines: 10,
    ridership_intensity: 0.5,
    has_stats: daily > 0,
  } as unknown as MergedCity;
}

const data = [
  city('shanghai', '上海', 1200, 800),
  city('beijing', '北京', 1100, 700),
  city('guangzhou', '广州', 900, 600),
  city('chengdu', '成都', 600, 500),
  city('xian', '西安', 350, 300),
];

describe('hero3d sceneData 纯函数', () => {
  it('rankCities：按指标降序 + 排名 + 坐标', () => {
    const ranked = rankCities(data, 'daily_ridership_wan');
    expect(ranked.map((d) => d.city)).toEqual([
      'shanghai', 'beijing', 'guangzhou', 'chengdu', 'xian',
    ]);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].value).toBe(1200);
    expect(ranked[0].lng).toBeGreaterThan(70);
  });

  it('buildFlylines：hub（榜首）→ Top N-1，count 受 quality 收敛', () => {
    const ranked = rankCities(data, 'daily_ridership_wan');
    const lines = buildFlylines(ranked, 3);
    expect(lines).toHaveLength(3);
    expect(lines[0].coords[0]).toEqual(ranked[0] && [ranked[0].lng, ranked[0].lat]);
    expect(lines[2].coords[1]).toEqual([ranked[3].lng, ranked[3].lat]);
    expect(buildFlylines(ranked, 0)).toHaveLength(0);
    expect(buildFlylines([], 9)).toHaveLength(0);
  });

  it('buildNodeData：选中/悬停朱砂放大、其余降弱、标签显隐', () => {
    const ranked = rankCities(data, 'daily_ridership_wan');
    const maxVal = metricMax(ranked);

    const plain = buildNodeData(ranked, maxVal, {
      selectedCity: null,
      hoveredCity: null,
      labelCount: 3,
      showLabels: true,
    });
    expect(plain[0].label.show).toBe(true); // Top3 有标签
    expect(plain[4].label.show).toBe(false);
    expect(plain.every((n) => n.itemStyle.opacity === 0.95)).toBe(true);

    const hovered = buildNodeData(ranked, maxVal, {
      selectedCity: null,
      hoveredCity: 'beijing',
      labelCount: 3,
      showLabels: true,
    });
    const bj = hovered.find((n) => n.city === 'beijing')!;
    const sh = hovered.find((n) => n.city === 'shanghai')!;
    expect(bj.itemStyle.color).toBe('#d0553f'); // 朱砂
    expect(bj.symbolSize).toBeGreaterThan(
      plain.find((n) => n.city === 'beijing')!.symbolSize,
    );
    expect(bj.label.show).toBe(true); // 悬停显示城市名
    expect(sh.itemStyle.opacity).toBe(0.45); // 其余降弱

    const noLabels = buildNodeData(ranked, maxVal, {
      selectedCity: null,
      hoveredCity: null,
      labelCount: 3,
      showLabels: false,
    });
    expect(noLabels.every((n) => !n.label.show)).toBe(true);
  });

  it('metricMax 保底 1（空数据不除零）', () => {
    expect(metricMax([])).toBe(1);
  });

  it('metric 切换后重排序生效', () => {
    const byMileage = rankCities(data, 'operating_mileage_km' as MetricKey);
    expect(byMileage[0].city).toBe('shanghai');
    expect(byMileage[1].value).toBe(700);
  });
});
