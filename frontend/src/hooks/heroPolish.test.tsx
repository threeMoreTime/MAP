import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import HeroOverlay from '../components/dashboard3d/HeroOverlay';
import HeroControls from '../components/dashboard3d/HeroControls';
import HeroCityPanel from '../components/dashboard3d/HeroCityPanel';
import HeroHint from '../components/dashboard3d/HeroHint';
import HeroRanking from '../components/dashboard3d/HeroRanking';
import { rankCities } from '../lib/hero3d/sceneData';
import type { MergedCity } from './useMetroData';

function city(name: string, nameCn: string, daily: number, intensity = 0.8): MergedCity {
  return {
    city: name,
    city_cn: nameCn,
    daily_ridership_wan: daily,
    operating_mileage_km: 700,
    operating_stations: 100,
    operating_lines: 10,
    ridership_intensity: intensity,
    has_stats: true,
  } as unknown as MergedCity;
}

const ranked = rankCities(
  [city('shanghai', '上海', 1200), city('beijing', '北京', 1100), city('guangzhou', '广州', 900)],
  'daily_ridership_wan',
);

describe('HeroOverlay 数据日期（manifest.stats_scrape_date）', () => {
  const base = { citiesCount: 50, statsCount: 34, metric: 'daily_ridership_wan' as const, onMetricChange: () => {}, revealed: true, focused: false };

  it('有日期：显示「数据截至 YYYY-MM-DD · 公开数据快照 · 非实时数据」', () => {
    render(<HeroOverlay {...base} dataDate="2026-05-08" />);
    expect(document.body.textContent).toContain('数据截至 2026-05-08 · 公开数据快照 · 非实时数据');
  });

  it('无日期：优雅降级，不出现「数据截至」', () => {
    render(<HeroOverlay {...base} dataDate={null} />);
    expect(document.body.textContent).toContain('公开数据快照 · 非实时数据');
    expect(document.body.textContent).not.toContain('数据截至');
  });

  it('飞线声明独立成行，不与日期句合并', () => {
    render(<HeroOverlay {...base} dataDate="2026-05-08" />);
    expect(document.body.textContent).toContain('飞线为视觉示意，不代表实际客流流向');
  });
});

describe('HeroOverlay focused 信息减法', () => {
  const base = { citiesCount: 50, statsCount: 34, metric: 'daily_ridership_wan' as const, onMetricChange: () => {}, revealed: true, dataDate: null };

  it('focused：资源 tags 与覆盖说明 opacity-0，标题/切换器不受影响', () => {
    const { container } = render(<HeroOverlay {...base} focused />);
    const dimmed = container.querySelectorAll('.opacity-0');
    // tags 行 + 覆盖说明（2 个元素被弱化）
    expect(dimmed.length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('h1')).not.toHaveClass('opacity-0');
  });

  it('overview：全部可见（无 opacity-0 的信息元素）', () => {
    const { container } = render(<HeroOverlay {...base} focused={false} />);
    expect(container.querySelectorAll('.opacity-0').length).toBe(0);
  });
});

describe('HeroControls 移动折叠菜单', () => {
  const base = { autoRotateEnabled: true, showLines: true, showLabels: true, revealed: true, onToggleAutoRotate: () => {}, onToggleLines: () => {}, onToggleLabels: () => {}, onResetView: () => {} };

  it('点击场景设置展开菜单，Escape 关闭', () => {
    render(<HeroControls {...base} />);
    const trigger = screen.getByRole('button', { name: '场景设置' });
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(trigger);
    expect(screen.getByRole('menu', { name: '场景设置' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemcheckbox', { name: /自动旋转/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('菜单项点击外部关闭', () => {
    render(<HeroControls {...base} />);
    fireEvent.click(screen.getByRole('button', { name: '场景设置' }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('菜单项触发回调', () => {
    const onResetView = vi.fn();
    render(<HeroControls {...base} onResetView={onResetView} />);
    fireEvent.click(screen.getByRole('button', { name: '场景设置' }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /重置视角/ }));
    expect(onResetView).toHaveBeenCalled();
  });

  it('desktop 四个独立按钮带自定义 tooltip（role=tooltip）', () => {
    render(<HeroControls {...base} />);
    expect(screen.getByRole('tooltip', { name: '重置视角' })).toBeInTheDocument();
    expect(screen.getAllByRole('tooltip')).toHaveLength(4);
  });
});

describe('HeroCityPanel 完整详情 CTA', () => {
  function Probe() {
    const loc = useLocation();
    return loc.pathname !== '/' ? <div data-testid="navigated">{loc.pathname}</div> : null;
  }
  const panelCity = city('beijing', '北京', 1100);

  it('点击「查看完整城市详情」经 React Router 跳转 /city/:id', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Probe />
        <HeroCityPanel city={panelCity} phase="enter" onClose={() => {}} />
      </MemoryRouter>,
    );
    const cta = screen.getByRole('button', { name: /查看完整城市详情/ });
    fireEvent.click(cta);
    expect(screen.getByTestId('navigated')).toHaveTextContent('/city/beijing');
  });
});

describe('HeroRanking 标题单位与比例条', () => {
  const base = { ranked, hoveredCity: null, selectedCity: null, count: 3, revealed: true, onHover: () => {}, onSelect: () => {} };

  it('有单位指标：标题含「日客流量 · 万人次」', () => {
    render(<HeroRanking {...base} metric="daily_ridership_wan" />);
    expect(screen.getByText('日客流量', { exact: false }).textContent).toContain('万人次');
  });

  it('里程：标题含「运营里程 · km」', () => {
    render(<HeroRanking {...base} metric="operating_mileage_km" />);
    expect(screen.getByText('运营里程', { exact: false }).textContent).toContain('km');
  });

  it('客流强度无单位：不出现多余「·」分隔', () => {
    render(<HeroRanking {...base} metric="ridership_intensity" />);
    const title = screen.getByText('客流强度', { exact: false }).textContent ?? '';
    expect(title).not.toContain('·');
  });

  it('行底层存在相对 Top1 的比例条', () => {
    const { container } = render(<HeroRanking {...base} metric="daily_ridership_wan" />);
    const bars = container.querySelectorAll('span[aria-hidden]');
    expect(bars.length).toBeGreaterThanOrEqual(3);
  });
});

describe('HeroHint 首次交互提示', () => {
  it('visible 时渲染提示文案（含 desktop 与 mobile 双版本）', () => {
    render(<HeroHint visible />);
    const el = screen.getByRole('status', { name: '交互提示' });
    expect(el.textContent).toContain('拖拽旋转 · 滚轮缩放 · 点击城市查看详情');
    expect(el.textContent).toContain('拖拽地图 · 点击城市');
  });

  it('不可见时 opacity-0 且文案仍在 DOM（过渡用）', () => {
    const { container } = render(<HeroHint visible={false} />);
    expect(container.firstElementChild).toHaveClass('opacity-0');
  });
});
