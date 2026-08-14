"""数据层校验器：校验 data/latest 下 JSON 的结构、数量一致性与路径存在性。

由 scripts/validate_data.py 忠实移植，路径参数化并返回结构化结果。
"""
import json
import os

from pipeline.config import ROOT as DEFAULT_ROOT
from pipeline.models import ValidationResult


def load_json(path: str, label: str, result: ValidationResult):
    if not os.path.exists(path):
        result.error(f"{label} 不存在: {path}")
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        result.error(f"{label} JSON 解析失败: {e}")
        return None


def validate_metro_stats(data, result: ValidationResult) -> None:
    if data is None:
        return
    if "items" not in data:
        result.error("metro_stats.json 缺少 items 字段")
        return

    items = data["items"]
    if not isinstance(items, list):
        result.error("metro_stats.json items 不是数组")
        return

    for i, item in enumerate(items):
        city = item.get("city", f"index={i}")
        for field in ["city", "city_cn", "scrape_date"]:
            if field not in item:
                result.error(f"{city}: 缺少必填字段 {field}")

        yearly = item.get("yearly_avg_ridership")
        if yearly:
            years = yearly.get("years", [])
            values = yearly.get("values", [])
            if len(years) != len(values):
                result.error(f"{city}: years({len(years)}) 与 values({len(values)}) 长度不一致")

        daily = item.get("daily_ridership_wan", 0)
        if daily <= 0:
            result.warning(f"{city} ({item.get('city_cn', '?')}): 日客流为 {daily}，暂无日客流数据")


def validate_city_assets_index(data, result: ValidationResult, root: str) -> None:
    if data is None:
        return
    if "items" not in data:
        result.error("city_assets_index.json 缺少 items 字段")
        return

    items = data["items"]
    if not isinstance(items, list):
        result.error("city_assets_index.json items 不是数组")
        return

    for item in items:
        city = item.get("city", "?")
        for key in ["network_map_path", "plan_map_path", "stats_path", "yearly_trend_path"]:
            path_val = item.get(key)
            if path_val:
                full = os.path.join(root, path_val.replace("/", os.sep))
                if not os.path.exists(full):
                    result.error(f"{city}: 资源路径不存在: {path_val}")


def resolve_manifest_data_file_path(path_value: str, data_dir: str, root: str) -> str:
    """自定义 data_dir 场景下把 data/latest/ 前缀映射到该目录。"""
    default_prefix = "data/latest/"
    if path_value.startswith(default_prefix):
        file_name = path_value[len(default_prefix):]
        default_data_dir = os.path.join(root, "data", "latest")
        if os.path.abspath(data_dir) != os.path.abspath(default_data_dir):
            return os.path.join(data_dir, file_name)

    return os.path.join(root, path_value.replace("/", os.sep))


def validate_manifest(manifest, stats, assets, data_dir: str, result: ValidationResult,
                      root: str) -> None:
    if manifest is None:
        return

    if stats:
        stats_count = manifest.get("stats_city_count", -1)
        actual_stats = len(stats.get("items", []))
        if stats_count != actual_stats:
            result.error(f"manifest.stats_city_count({stats_count}) 与 metro_stats.items({actual_stats}) 不一致")

    if assets:
        asset_count = manifest.get("asset_city_count", -1)
        actual_assets = len(assets.get("items", []))
        if asset_count != actual_assets:
            result.error(f"manifest.asset_city_count({asset_count}) 与 city_assets_index.items({actual_assets}) 不一致")

    for df in manifest.get("data_files", []):
        full = resolve_manifest_data_file_path(df, data_dir, root)
        if not os.path.exists(full):
            result.error(f"manifest 引用的数据文件不存在: {df}")


def validate_quality_report(quality, assets, result: ValidationResult) -> None:
    if quality is None:
        return

    for field in ["summary", "cities", "missing_groups"]:
        if field not in quality:
            result.error(f"quality_report.json 缺少核心字段 {field}")
            return

    summary = quality["summary"]
    cities = quality["cities"]
    groups = quality["missing_groups"]

    total_cities = len(assets.get("items", [])) if assets else 50

    if summary.get("city_count", -1) != total_cities:
        result.error(f"quality_report.json summary.city_count({summary.get('city_count')}) 与 50 城索引({total_cities}) 不一致")
    if len(cities) != total_cities:
        result.error(f"quality_report.json cities 数组长度({len(cities)}) 与 50 城索引({total_cities}) 不一致")

    city_ids = set()
    if assets:
        city_ids = {item["city"] for item in assets.get("items", [])}

    for idx, item in enumerate(cities):
        city = item.get("city", f"index={idx}")
        if city_ids and city not in city_ids:
            result.error(f"quality_report.json 包含未注册的城市: {city}")

        score = item.get("quality_score", -1)
        if not isinstance(score, (int, float)) or not (0 <= score <= 100):
            result.error(f"{city}: quality_score({score}) 超出合法范围(0-100)")

        level = item.get("quality_level")
        if level not in ["high", "medium", "low"]:
            result.error(f"{city}: quality_level({level}) 不是合法选项(high / medium / low)")

    for group_name, list_val in groups.items():
        if not isinstance(list_val, list):
            result.error(f"quality_report.json missing_groups.{group_name} 不是数组")
            continue
        for c in list_val:
            if city_ids and c not in city_ids:
                result.error(f"quality_report.json missing_groups.{group_name} 中包含未注册城市: {c}")


def run(data_dir: str, root: str = DEFAULT_ROOT) -> ValidationResult:
    """执行全部校验并返回结构化结果。"""
    result = ValidationResult()

    if not os.path.exists(data_dir) or not os.path.isdir(data_dir):
        result.error(f"数据目录不存在: {data_dir}")
        return result

    stats = load_json(os.path.join(data_dir, "metro_stats.json"), "metro_stats.json", result)
    assets = load_json(os.path.join(data_dir, "city_assets_index.json"), "city_assets_index.json", result)
    manifest = load_json(os.path.join(data_dir, "manifest.json"), "manifest.json", result)
    quality = load_json(os.path.join(data_dir, "quality_report.json"), "quality_report.json", result)

    validate_metro_stats(stats, result)
    validate_city_assets_index(assets, result, root)
    validate_manifest(manifest, stats, assets, data_dir, result, root)
    validate_quality_report(quality, assets, result)

    return result
