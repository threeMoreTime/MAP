"""索引构建处理器：扫描 cities/ 生成统一数据层。

由 scripts/build_data_index.py 忠实移植，差异：
- 路径参数化（root 可注入，便于测试）
- 图片资源同时识别 .webp（优先）与 .png
"""
import json
import os

from pipeline.config import (
    ROOT as DEFAULT_ROOT,
    get_city_cn,
    iso_now,
    write_json_if_changed,
)


def scan_city_dirs(cities_dir: str) -> list:
    if not os.path.isdir(cities_dir):
        return []
    cities = []
    for name in sorted(os.listdir(cities_dir)):
        full = os.path.join(cities_dir, name)
        if not os.path.isdir(full) or name.startswith("."):
            continue
        cities.append(name)
    return cities


def _asset_path(root: str, city: str, kind: str) -> tuple:
    """返回 (repo 相对路径 or None)；kind: network / plan / yearly_trend。"""
    suffixes = ("webp", "png")
    for suffix in suffixes:
        rel = f"cities/{city}/{city}_{kind}.{suffix}"
        if os.path.exists(os.path.join(root, rel.replace("/", os.sep))):
            return rel
    return None


def build_metro_stats(cities: list, cities_dir: str) -> tuple:
    items = []
    no_daily = []
    for city in cities:
        json_path = os.path.join(cities_dir, city, f"{city}_stats.json")
        if not os.path.exists(json_path):
            continue
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        items.append(data)
        if data.get("daily_ridership_wan", 0) <= 0:
            no_daily.append(city)
    stats = {
        "generated_at": iso_now(),
        "source": "metrodb.org",
        "city_count": len(items),
        "no_daily_data_cities": no_daily,
        "items": items,
    }
    return stats, no_daily


def build_city_assets_index(cities: list, cities_dir: str, root: str) -> dict:
    items = []
    for city in cities:
        city_dir = os.path.join(cities_dir, city)
        stats_data = None
        stats_path = os.path.join(city_dir, f"{city}_stats.json")
        if os.path.exists(stats_path):
            with open(stats_path, "r", encoding="utf-8") as f:
                stats_data = json.load(f)

        network_map = _asset_path(root, city, "network")
        plan_map = _asset_path(root, city, "plan")
        yearly_trend = _asset_path(root, city, "yearly_trend")
        stats_rel = f"cities/{city}/{city}_stats.json" if stats_data else None

        items.append({
            "city": city,
            "city_cn": get_city_cn(city, stats_data),
            "dir": city,
            "has_network_map": network_map is not None,
            "network_map_path": network_map,
            "has_plan_map": plan_map is not None,
            "plan_map_path": plan_map,
            "has_stats": stats_data is not None,
            "stats_path": stats_rel,
            "has_yearly_trend": yearly_trend is not None,
            "yearly_trend_path": yearly_trend,
        })

    return {
        "generated_at": iso_now(),
        "city_count": len(items),
        "items": items,
    }


def build_manifest(stats: dict, assets: dict) -> dict:
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
        "data_files": [
            "data/latest/metro_stats.json",
            "data/latest/city_assets_index.json",
            "data/latest/quality_report.json",
        ],
    }


def build_schema() -> dict:
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
                            "pattern": r"^[a-z]+$",
                            "description": "城市拼音目录名",
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


def build_all(root: str = DEFAULT_ROOT) -> dict:
    """执行完整索引构建，返回统计摘要。质量报告由 quality_auditor 负责。"""
    cities_dir = os.path.join(root, "cities")
    data_latest = os.path.join(root, "data", "latest")

    cities = scan_city_dirs(cities_dir)

    stats, no_daily = build_metro_stats(cities, cities_dir)
    changed = write_json_if_changed(os.path.join(data_latest, "metro_stats.json"), stats)

    assets = build_city_assets_index(cities, cities_dir, root)
    changed = write_json_if_changed(os.path.join(data_latest, "city_assets_index.json"), assets)

    manifest = build_manifest(stats, assets)
    write_json_if_changed(os.path.join(data_latest, "manifest.json"), manifest)

    schema = build_schema()
    write_json_if_changed(
        os.path.join(root, "data", "schema", "metro_stats.schema.json"), schema
    )

    return {
        "city_dirs": len(cities),
        "stats_cities": stats["city_count"],
        "network_maps": manifest["network_map_count"],
        "plan_maps": manifest["plan_map_count"],
        "yearly_trends": manifest["yearly_trend_count"],
        "no_daily": no_daily,
        "stats_changed": changed,
    }
