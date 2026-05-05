"""
数据校验脚本
检查 data/latest 下所有 JSON 文件：
  - 结构完整性
  - 数量一致性
  - 路径存在性
  - yearly 数据长度一致
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATA_DIR = os.path.join(ROOT, "data", "latest")

errors = []
warnings = []


def err(msg):
    errors.append(msg)
    print(f"  [ERROR] {msg}")


def warn(msg):
    warnings.append(msg)
    print(f"  [WARN]  {msg}")


def load_json(path, label):
    if not os.path.exists(path):
        err(f"{label} 不存在: {path}")
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        err(f"{label} JSON 解析失败: {e}")
        return None


def validate_metro_stats(data):
    if data is None:
        return
    if "items" not in data:
        err("metro_stats.json 缺少 items 字段")
        return

    items = data["items"]
    if not isinstance(items, list):
        err("metro_stats.json items 不是数组")
        return

    for i, item in enumerate(items):
        city = item.get("city", f"index={i}")
        # 必填字段
        for field in ["city", "city_cn", "scrape_date"]:
            if field not in item:
                err(f"{city}: 缺少必填字段 {field}")

        # yearly 数据长度一致性
        yearly = item.get("yearly_avg_ridership")
        if yearly:
            years = yearly.get("years", [])
            values = yearly.get("values", [])
            if len(years) != len(values):
                err(f"{city}: years({len(years)}) 与 values({len(values)}) 长度不一致")

        # daily_ridership_wan <= 0 为 warning
        daily = item.get("daily_ridership_wan", 0)
        if daily <= 0:
            warn(f"{city} ({item.get('city_cn', '?')}): 日客流为 {daily}，暂无日客流数据")


def validate_city_assets_index(data):
    if data is None:
        return
    if "items" not in data:
        err("city_assets_index.json 缺少 items 字段")
        return

    items = data["items"]
    if not isinstance(items, list):
        err("city_assets_index.json items 不是数组")
        return

    for item in items:
        city = item.get("city", "?")
        # 检查标记为 true 的资源路径是否存在
        for key in ["network_map_path", "plan_map_path", "stats_path", "yearly_trend_path"]:
            path_val = item.get(key)
            has_key = key.replace("_path", "").replace("stats", "has_stats")
            if has_key not in item:
                has_key = f"has_{key.replace('_path', '').replace('stats', 'stats')}"
            # 简化: 如果路径不为 null，检查文件存在
            if path_val:
                full = os.path.join(ROOT, path_val.replace("/", os.sep))
                if not os.path.exists(full):
                    err(f"{city}: 资源路径不存在: {path_val}")


def validate_manifest(manifest, stats, assets):
    if manifest is None:
        return

    # 数量一致性
    if stats:
        stats_count = manifest.get("stats_city_count", -1)
        actual_stats = len(stats.get("items", []))
        if stats_count != actual_stats:
            err(f"manifest.stats_city_count({stats_count}) 与 metro_stats.items({actual_stats}) 不一致")

    if assets:
        asset_count = manifest.get("asset_city_count", -1)
        actual_assets = len(assets.get("items", []))
        if asset_count != actual_assets:
            err(f"manifest.asset_city_count({asset_count}) 与 city_assets_index.items({actual_assets}) 不一致")

    # data_files 路径存在性
    for df in manifest.get("data_files", []):
        full = os.path.join(ROOT, df.replace("/", os.sep))
        if not os.path.exists(full):
            err(f"manifest 引用的数据文件不存在: {df}")


def main():
    print("=" * 50)
    print(" 数据校验")
    print("=" * 50)

    stats = load_json(os.path.join(DATA_DIR, "metro_stats.json"), "metro_stats.json")
    assets = load_json(os.path.join(DATA_DIR, "city_assets_index.json"), "city_assets_index.json")
    manifest = load_json(os.path.join(DATA_DIR, "manifest.json"), "manifest.json")

    print()
    print("[1/3] 校验 metro_stats.json ...")
    validate_metro_stats(stats)

    print()
    print("[2/3] 校验 city_assets_index.json ...")
    validate_city_assets_index(assets)

    print()
    print("[3/3] 校验 manifest.json ...")
    validate_manifest(manifest, stats, assets)

    # 汇总
    print()
    print("-" * 50)
    print(f"  Errors:   {len(errors)}")
    print(f"  Warnings: {len(warnings)}")

    # 缺失日客流城市
    if stats and stats.get("no_daily_data_cities"):
        no_daily = stats["no_daily_data_cities"]
        print(f"  缺失日客流城市 ({len(no_daily)}):")
        for c in no_daily:
            print(f"    - {c}")

    print("-" * 50)

    if errors:
        print("结果: FAIL")
        sys.exit(1)
    else:
        print("结果: PASS")
        sys.exit(0)


if __name__ == "__main__":
    main()
