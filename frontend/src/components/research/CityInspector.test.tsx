import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MergedCity } from "../../hooks/useMetroData";
import CityInspector from "./CityInspector";

const city = {
  city: "hangzhou", city_cn: "杭州", has_network_map: true, has_plan_map: false,
  stats: { scrape_date: "2026-05-08", daily_ridership_wan: 0,
    yearly_avg_ridership: { years: [2023,2024,2025,2026], values: [300,400,423.52,410] } },
} as MergedCity;
const second = {...city, city:"xiamen", city_cn:"厦门", stats:null};
afterEach(() => { cleanup(); sessionStorage.clear(); });
function mount(metric: "annual" | "daily_snapshot" = "annual", year=2025, selected=city) {
  const onSelect=vi.fn();
  render(<MemoryRouter><CityInspector city={selected} cities={[city,second]} metric={metric} year={year} onSelect={onSelect}/></MemoryRouter>);
  return onSelect;
}
describe("Studio city inspector", () => {
  it("keeps annual history available when the daily snapshot is missing", () => {
    mount("daily_snapshot");
    expect(screen.getByText("当前指标缺失")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    const chart=screen.getByRole("img");
    expect(chart).toHaveAccessibleName("杭州 2023 至 2025 年日均客流原值趋势");
    expect(within(chart).getByText("2025 年：423.52 万人次 / 日")).toBeInTheDocument();
    expect(within(chart).queryByText(/2026 年/)).not.toBeInTheDocument();
  });
  it("limits historical context to the selected year", () => {
    mount("annual",2024);
    const chart=screen.getByRole("img");
    expect(chart).toHaveAccessibleName("杭州 2023 至 2024 年日均客流原值趋势");
    expect(within(chart).queryByText(/2025 年/)).not.toBeInTheDocument();
    expect(screen.getByText("400")).toBeInTheDocument();
  });
  it("provides keyboard city selection and a real archive link", () => {
    const onSelect=mount();
    fireEvent.change(screen.getByRole("combobox", {name:"切换关注城市"}),{target:{value:"xiamen"}});
    expect(onSelect).toHaveBeenCalledWith("xiamen");
    expect(screen.getByRole("link",{name:"查看完整档案"})).toHaveAttribute("href",expect.stringContaining("/city/hangzhou"));
  });
  it("does not invent a trend for a city without statistical records", () => {
    mount("annual",2025,second);
    expect(screen.getByText("暂无可展示的年度序列")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
