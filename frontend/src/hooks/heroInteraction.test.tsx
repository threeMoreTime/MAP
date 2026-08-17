import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HeroMetricSwitcher from '../components/dashboard3d/HeroMetricSwitcher';
import HeroRanking from '../components/dashboard3d/HeroRanking';
import { rankCities } from '../lib/hero3d/sceneData';
import type { MergedCity } from './useMetroData';

function city(name: string, nameCn: string, daily: number): MergedCity {
  return {
    city: name,
    city_cn: nameCn,
    daily_ridership_wan: daily,
    operating_mileage_km: 700,
    operating_stations: 100,
    operating_lines: 10,
    ridership_intensity: 0.5,
    has_stats: true,
  } as unknown as MergedCity;
}

const ranked = rankCities(
  [city('shanghai', '上海', 1200), city('beijing', '北京', 1100), city('guangzhou', '广州', 900)],
  'daily_ridership_wan',
);

describe('HeroMetricSwitcher（Hero 与 Dashboard 共用 metric 状态）', () => {
  it('渲染四个指标胶囊，aria-pressed 反映当前指标', () => {
    render(<HeroMetricSwitcher metric="daily_ridership_wan" onMetricChange={() => {}} />);
    const group = screen.getByRole('group', { name: '主指标切换' });
    expect(group).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('点击胶囊回调完整 MetricKey（页面 setMetric 即单一 source of truth）', () => {
    const onMetricChange = vi.fn();
    render(<HeroMetricSwitcher metric="daily_ridership_wan" onMetricChange={onMetricChange} />);
    fireEvent.click(screen.getByRole('button', { name: '运营里程' }));
    expect(onMetricChange).toHaveBeenCalledWith('operating_mileage_km');
  });
});

describe('HeroRanking（地图/排行双向联动入口）', () => {
  it('渲染 Top N 行：第一名朱砂，aria-label 含排名与指标值', () => {
    render(
      <HeroRanking
        ranked={ranked}
        metric="daily_ridership_wan"
        hoveredCity={null}
        selectedCity={null}
        revealed={true}
        count={2}
        onHover={() => {}}
        onSelect={() => {}}
      />,
    );
    const rows = screen.getAllByRole('button');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute('aria-label', '第1名 上海 1200.0 万人次');
    expect(rows[1]).toHaveAttribute('aria-label', '第2名 北京 1100.0 万人次');
  });

  it('hover 行 → onHover(city)；离开 → onHover(null)；点击 → onSelect', () => {
    const onHover = vi.fn();
    const onSelect = vi.fn();
    render(
      <HeroRanking
        ranked={ranked}
        metric="daily_ridership_wan"
        hoveredCity="beijing"
        selectedCity={null}
        revealed={true}
        count={3}
        onHover={onHover}
        onSelect={onSelect}
      />,
    );
    const bj = screen.getByRole('button', { name: /第2名 北京/ });
    fireEvent.mouseEnter(bj);
    expect(onHover).toHaveBeenCalledWith('beijing');
    fireEvent.mouseLeave(bj);
    expect(onHover).toHaveBeenCalledWith(null);
    // 地图 hover 联动：hoveredCity=beijing 的行带 ▸ 前导符（非仅颜色）
    expect(bj.textContent).toContain('▸');
    fireEvent.click(bj);
    expect(onSelect).toHaveBeenCalledWith('beijing');
  });

  it('键盘可达：focus 行触发 hover 联动', () => {
    const onHover = vi.fn();
    render(
      <HeroRanking
        ranked={ranked}
        metric="daily_ridership_wan"
        hoveredCity={null}
        selectedCity={null}
        revealed={true}
        count={3}
        onHover={onHover}
        onSelect={() => {}}
      />,
    );
    const sh = screen.getByRole('button', { name: /第1名 上海/ });
    fireEvent.focus(sh);
    expect(onHover).toHaveBeenCalledWith('shanghai');
    fireEvent.blur(sh);
    expect(onHover).toHaveBeenCalledWith(null);
  });
});
