"""
地铁客流数据可视化图表生成
读取各城市 _stats.json，生成图表 PNG
"""
import json
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# 配置中文字体
def setup_chinese_font():
    candidates = [
        "C:/Windows/Fonts/msyh.ttc",    # 微软雅黑
        "C:/Windows/Fonts/simhei.ttf",   # 黑体
        "C:/Windows/Fonts/simsun.ttc",   # 宋体
    ]
    for path in candidates:
        if os.path.exists(path):
            fm.fontManager.addfont(path)
            prop = fm.FontProperties(fname=path)
            plt.rcParams["font.family"] = prop.get_name()
            plt.rcParams["axes.unicode_minus"] = False
            return prop.get_name()
    return None

FONT_NAME = setup_chinese_font()
print(f"中文字体: {FONT_NAME or '未找到，可能显示异常'}")


def load_all_stats():
    all_data = []
    for name in sorted(os.listdir(SCRIPT_DIR)):
        city_dir = os.path.join(SCRIPT_DIR, name)
        if not os.path.isdir(city_dir):
            continue
        json_path = os.path.join(city_dir, f"{name}_stats.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                all_data.append(json.load(f))
    return all_data


def gen_yearly_trend(data):
    """单城市年度客流趋势折线图"""
    city = data["city"]
    city_cn = data["city_cn"]
    city_dir = os.path.join(SCRIPT_DIR, city)
    out_path = os.path.join(city_dir, f"{city}_yearly_trend.png")

    yearly = data.get("yearly_avg_ridership", {})
    years = yearly.get("years", [])
    values = yearly.get("values", [])

    if not years or not values:
        return

    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.plot(years, values, "o-", color="#2196F3", linewidth=2.5, markersize=8)

    for x, y in zip(years, values):
        ax.annotate(f"{y:.1f}", (x, y), textcoords="offset points",
                    xytext=(0, 12), ha="center", fontsize=9)

    ax.set_title(f"{city_cn}地铁年日均客流量（万人次）", fontsize=14, fontweight="bold")
    ax.set_xlabel("年份", fontsize=11)
    ax.set_ylabel("日均客流（万人次）", fontsize=11)
    ax.set_xticks(years)
    ax.grid(axis="y", alpha=0.3)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    plt.tight_layout()
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  生成: {city_cn} 年度趋势图")


def gen_national_comparison(all_data):
    """全国城市日客流量对比排行榜柱状图"""
    # 过滤有客流数据的城市
    ranked = [d for d in all_data if d["daily_ridership_wan"] > 0]
    ranked.sort(key=lambda x: x["daily_ridership_wan"], reverse=True)

    if not ranked:
        print("  跳过: 无日客流数据")
        return

    cities = [d["city_cn"] for d in ranked]
    flows = [d["daily_ridership_wan"] for d in ranked]

    # 颜色梯度
    colors = plt.cm.RdYlBu_r(np.linspace(0.15, 0.85, len(cities)))

    fig, ax = plt.subplots(figsize=(14, max(8, len(cities) * 0.45)))
    bars = ax.barh(range(len(cities)), flows, color=colors, edgecolor="white", linewidth=0.5)

    ax.set_yticks(range(len(cities)))
    ax.set_yticklabels(cities, fontsize=11)
    ax.invert_yaxis()
    ax.set_xlabel("日客流量（万人次）", fontsize=12)
    ax.set_title("全国城市地铁日客流量排行榜", fontsize=16, fontweight="bold")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    for bar, val in zip(bars, flows):
        ax.text(bar.get_width() + max(flows) * 0.01, bar.get_y() + bar.get_height() / 2,
                f"{val:.1f}万", va="center", fontsize=10, color="#333")

    plt.tight_layout()
    out_path = os.path.join(SCRIPT_DIR, "national_comparison.png")
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  生成: 全国日客流量排行榜 ({len(ranked)} 个城市)")


def gen_overview_dashboard(all_data):
    """全国概览仪表盘"""
    valid = [d for d in all_data if d["operating_stations"] > 0]
    if not valid:
        return

    total_cities = len(valid)
    total_stations = sum(d["operating_stations"] for d in valid)
    total_mileage = sum(d["operating_mileage_km"] for d in valid)
    total_daily = sum(d["daily_ridership_wan"] for d in valid)
    total_lines = sum(d["operating_lines"] for d in valid)

    fig = plt.figure(figsize=(16, 10))
    fig.suptitle("全国城市地铁运营概览", fontsize=20, fontweight="bold", y=0.97)

    # 顶部指标卡片
    metrics = [
        ("覆盖城市", f"{total_cities}", "座"),
        ("运营线路", f"{total_lines}", "条"),
        ("运营站点", f"{total_stations}", "座"),
        ("总里程", f"{total_mileage:.0f}", "km"),
        ("日总客流", f"{total_daily:.0f}", "万人次"),
    ]

    for i, (label, value, unit) in enumerate(metrics):
        ax = fig.add_axes([0.05 + i * 0.19, 0.85, 0.16, 0.08])
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.text(0.5, 0.65, value, ha="center", va="center", fontsize=22, fontweight="bold", color="#1565C0")
        ax.text(0.5, 0.2, f"{label}（{unit}）", ha="center", va="center", fontsize=10, color="#666")
        ax.axis("off")
        # 边框
        for spine in ax.spines.values():
            spine.set_visible(True)
            spine.set_color("#ddd")

    # 左下: Top 10 日客流柱状图
    ax1 = fig.add_axes([0.06, 0.08, 0.42, 0.65])
    top10 = sorted([d for d in valid if d["daily_ridership_wan"] > 0],
                   key=lambda x: x["daily_ridership_wan"], reverse=True)[:10]
    if top10:
        names = [d["city_cn"] for d in top10]
        vals = [d["daily_ridership_wan"] for d in top10]
        colors = plt.cm.Blues(np.linspace(0.4, 0.9, len(names)))
        ax1.barh(range(len(names)), vals, color=colors)
        ax1.set_yticks(range(len(names)))
        ax1.set_yticklabels(names, fontsize=11)
        ax1.invert_yaxis()
        ax1.set_xlabel("万人次", fontsize=10)
        ax1.set_title("日客流量 Top 10", fontsize=13, fontweight="bold")
        ax1.spines["top"].set_visible(False)
        ax1.spines["right"].set_visible(False)
        for j, v in enumerate(vals):
            ax1.text(v + max(vals) * 0.02, j, f"{v:.1f}", va="center", fontsize=10)

    # 右下: Top 10 里程柱状图
    ax2 = fig.add_axes([0.56, 0.08, 0.42, 0.65])
    top10_mile = sorted(valid, key=lambda x: x["operating_mileage_km"], reverse=True)[:10]
    names2 = [d["city_cn"] for d in top10_mile]
    vals2 = [d["operating_mileage_km"] for d in top10_mile]
    colors2 = plt.cm.Greens(np.linspace(0.4, 0.9, len(names2)))
    ax2.barh(range(len(names2)), vals2, color=colors2)
    ax2.set_yticks(range(len(names2)))
    ax2.set_yticklabels(names2, fontsize=11)
    ax2.invert_yaxis()
    ax2.set_xlabel("km", fontsize=10)
    ax2.set_title("运营里程 Top 10", fontsize=13, fontweight="bold")
    ax2.spines["top"].set_visible(False)
    ax2.spines["right"].set_visible(False)
    for j, v in enumerate(vals2):
        ax2.text(v + max(vals2) * 0.02, j, f"{v:.0f}", va="center", fontsize=10)

    out_path = os.path.join(SCRIPT_DIR, "overview_dashboard.png")
    plt.savefig(out_path, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close()
    print(f"  生成: 全国概览仪表盘")


def main():
    print("=" * 44)
    print(" 地铁客流可视化图表生成")
    print("=" * 44)

    all_data = load_all_stats()
    print(f"加载 {len(all_data)} 个城市数据\n")

    # 1. 各城市年度趋势图
    print("[1/3] 生成各城市年度趋势图...")
    for d in all_data:
        gen_yearly_trend(d)

    # 2. 全国对比排行榜
    print("\n[2/3] 生成全国对比排行榜...")
    gen_national_comparison(all_data)

    # 3. 全国概览仪表盘
    print("\n[3/3] 生成全国概览仪表盘...")
    gen_overview_dashboard(all_data)

    print("\n完成!")


if __name__ == "__main__":
    main()
