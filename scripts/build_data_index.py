"""
数据索引构建脚本
扫描城市目录，生成统一数据层：
  data/latest/metro_stats.json
  data/latest/city_assets_index.json
  data/latest/manifest.json
  data/schema/metro_stats.schema.json
"""
import json
import os
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 目录名 → 中文名（与 scrape_metrodb.py 保持一致）
CITY_CN_MAP = {
    "beijing": "北京", "shanghai": "上海", "guangzhou": "广州", "shenzhen": "深圳",
    "chengdu": "成都", "wuhan": "武汉", "chongqing": "重庆", "xian": "西安",
    "hangzhou": "杭州", "nanjing": "南京", "tianjin": "天津", "zhengzhou": "郑州",
    "changsha": "长沙", "shenyang": "沈阳", "suzhou": "苏州", "nanning": "南宁",
    "changchun": "长春", "taiyuan": "太原", "qingdao": "青岛", "dalian": "大连",
    "hohhot": "呼和浩特", "changzhou": "常州", "kunming": "昆明", "dongguan": "东莞",
    "guiyang": "贵阳", "nanchang": "南昌", "hefei": "合肥", "harbin": "哈尔滨",
    "shijiazhuang": "石家庄", "xiamen": "厦门", "lanzhou": "兰州", "wuxi": "无锡",
    "wuhu": "芜湖", "foshan": "佛山", "shaoxing": "绍兴", "nantong": "南通",
    "fuzhou": "福州", "ningbo": "宁波", "wenzhou": "温州", "jinan": "济南",
    "luoyang": "洛阳", "xuzhou": "徐州", "urumqi": "乌鲁木齐", "hongkong": "香港",
    "macau": "澳门", "kaohsiung": "高雄", "taichung": "台中", "taipei": "台北",
    "jinhua": "金华", "taizhou": "台州", "taoyuan": "桃园",
}

EXCLUDED_DIRS = {"assets", "docs", "data", "scripts", ".github", "node_modules", "__pycache__"}


def iso_now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def get_city_cn(city_dir_name, stats_data=None):
    if stats_data and "city_cn" in stats_data:
        return stats_data["city_cn"]
    return CITY_CN_MAP.get(city_dir_name, city_dir_name)


def scan_city_dirs():
    cities = []
    for name in sorted(os.listdir(ROOT)):
        full = os.path.join(ROOT, name)
        if not os.path.isdir(full):
            continue
        if name.startswith(".") or name in EXCLUDED_DIRS:
            continue
        cities.append(name)
    return cities


def build_metro_stats(cities):
    items = []
    no_daily = []
    for city in cities:
        json_path = os.path.join(ROOT, city, f"{city}_stats.json")
        if not os.path.exists(json_path):
            continue
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        items.append(data)
        if data.get("daily_ridership_wan", 0) <= 0:
            no_daily.append(city)
    return {
        "generated_at": iso_now(),
        "source": "metrodb.org",
        "city_count": len(items),
        "no_daily_data_cities": no_daily,
        "items": items,
    }, no_daily


def build_city_assets_index(cities):
    items = []
    for city in cities:
        city_dir = os.path.join(ROOT, city)
        stats_data = None
        stats_path = os.path.join(city_dir, f"{city}_stats.json")
        if os.path.exists(stats_path):
            with open(stats_path, "r", encoding="utf-8") as f:
                stats_data = json.load(f)

        network_map = f"{city}/{city}_network.png"
        plan_map = f"{city}/{city}_plan.png"
        yearly_trend = f"{city}/{city}_yearly_trend.png"

        items.append({
            "city": city,
            "city_cn": get_city_cn(city, stats_data),
            "dir": city,
            "has_network_map": os.path.exists(os.path.join(ROOT, network_map)),
            "network_map_path": network_map if os.path.exists(os.path.join(ROOT, network_map)) else None,
            "has_plan_map": os.path.exists(os.path.join(ROOT, plan_map)),
            "plan_map_path": plan_map if os.path.exists(os.path.join(ROOT, plan_map)) else None,
            "has_stats": stats_data is not None,
            "stats_path": f"{city}/{city}_stats.json" if stats_data else None,
            "has_yearly_trend": os.path.exists(os.path.join(ROOT, yearly_trend)),
            "yearly_trend_path": yearly_trend if os.path.exists(os.path.join(ROOT, yearly_trend)) else None,
        })

    return {
        "generated_at": iso_now(),
        "city_count": len(items),
        "items": items,
    }


def build_manifest(stats, assets):
    net_count = sum(1 for i in assets["items"] if i["has_network_map"])
    plan_count = sum(1 for i in assets["items"] if i["has_plan_map"])
    trend_count = sum(1 for i in assets["items"] if i["has_yearly_trend"])
    return {
        "generated_at": iso_now(),
        "version": "v1.0.0",
        "stats_city_count": stats["city_count"],
        "asset_city_count": assets["city_count"],
        "network_map_count": net_count,
        "plan_map_count": plan_count,
        "yearly_trend_count": trend_count,
        "no_daily_data_count": len(stats["no_daily_data_cities"]),
        "no_daily_data_cities": stats["no_daily_data_cities"],
        "dashboard_file": "dashboard.html",
        "data_files": [
            "data/latest/metro_stats.json",
            "data/latest/city_assets_index.json",
        ],
    }


def build_schema():
    return {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "MetroStats",
        "description": "城市地铁客流统计数据集合",
        "type": "object",
        "required": ["generated_at", "source", "city_count", "items"],
        "properties": {
            "generated_at": {
                "type": "string",
                "description": "生成时间（ISO 8601）",
            },
            "source": {
                "type": "string",
                "description": "数据来源",
            },
            "city_count": {
                "type": "integer",
                "minimum": 0,
                "description": "包含数据的城市总数",
            },
            "no_daily_data_cities": {
                "type": "array",
                "items": {"type": "string"},
                "description": "日客流为 0 或缺失的城市列表",
            },
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["city", "city_cn", "scrape_date"],
                    "properties": {
                        "city": {
                            "type": "string",
                            "description": "城市拼音代码",
                        },
                        "city_cn": {
                            "type": "string",
                            "description": "城市中文名",
                        },
                        "scrape_date": {
                            "type": "string",
                            "pattern": r"^\d{4}-\d{2}-\d{2}$",
                            "description": "数据采集日期",
                        },
                        "operating_lines": {
                            "type": "integer",
                            "minimum": 0,
                            "description": "运营线路数",
                        },
                        "lines_under_construction": {
                            "type": "integer",
                            "minimum": 0,
                            "description": "在建线路数",
                        },
                        "operating_stations": {
                            "type": "integer",
                            "minimum": 0,
                            "description": "运营站点数",
                        },
                        "operating_mileage_km": {
                            "type": "number",
                            "minimum": 0,
                            "description": "运营里程（公里）",
                        },
                        "daily_ridership_wan": {
                            "type": "number",
                            "minimum": 0,
                            "description": "日客流量（万人次），0 表示暂无数据",
                        },
                        "ridership_intensity": {
                            "type": "number",
                            "minimum": 0,
                            "description": "客流强度",
                        },
                        "peak_ridership_wan": {
                            "type": "number",
                            "minimum": 0,
                            "description": "历史最高日客流量（万人次）",
                        },
                        "peak_ridership_date": {
                            "type": "string",
                            "description": "历史最高日客流日期",
                        },
                        "yearly_avg_ridership": {
                            "type": "object",
                            "required": ["years", "values"],
                            "properties": {
                                "years": {
                                    "type": "array",
                                    "items": {"type": "integer"},
                                    "description": "年份列表",
                                },
                                "values": {
                                    "type": "array",
                                    "items": {"type": "number"},
                                    "description": "对应年份日客流量（万人次）",
                                },
                            },
                            "additionalProperties": False,
                        },
                    },
                },
            },
        },
        "additionalProperties": True,
    }


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    print("=" * 50)
    print(" 数据索引构建")
    print("=" * 50)

    cities = scan_city_dirs()
    print(f"扫描城市目录: {len(cities)} 个")

    # 1. metro_stats.json
    stats, no_daily = build_metro_stats(cities)
    stats_path = os.path.join(ROOT, "data", "latest", "metro_stats.json")
    write_json(stats_path, stats)
    print(f"  metro_stats.json: {stats['city_count']} 个城市")

    # 2. city_assets_index.json
    assets = build_city_assets_index(cities)
    assets_path = os.path.join(ROOT, "data", "latest", "city_assets_index.json")
    write_json(assets_path, assets)
    print(f"  city_assets_index.json: {assets['city_count']} 个城市")

    # 3. manifest.json
    manifest = build_manifest(stats, assets)
    manifest_path = os.path.join(ROOT, "data", "latest", "manifest.json")
    write_json(manifest_path, manifest)
    print(f"  manifest.json: 版本 {manifest['version']}")

    # 4. metro_stats.schema.json
    schema = build_schema()
    schema_path = os.path.join(ROOT, "data", "schema", "metro_stats.schema.json")
    write_json(schema_path, schema)
    print(f"  metro_stats.schema.json")

    # 统计摘要
    net_count = manifest["network_map_count"]
    plan_count = manifest["plan_map_count"]
    trend_count = manifest["yearly_trend_count"]

    print()
    print("-" * 50)
    print(f"  城市目录:       {len(cities)}")
    print(f"  Stats JSON:     {stats['city_count']}")
    print(f"  线路图 PNG:     {net_count}")
    print(f"  规划图 PNG:     {plan_count}")
    print(f"  年度趋势图:     {trend_count}")
    print(f"  缺失日客流:     {len(no_daily)} 个城市")
    if no_daily:
        print(f"    {', '.join(no_daily)}")
    print("-" * 50)
    print("完成!")


if __name__ == "__main__":
    main()
