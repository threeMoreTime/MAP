#!/usr/bin/env python3
"""
Phase 6 数据快照差分脚本
用于比较两个数据快照目录，忽略 generated_at 和 scrape_date 等噪声时间戳，
输出机器可读的 JSON 报告和高可读性的 Markdown 报告，并通过 exit code 与 CI/CD 流水线通信。

退出码约定:
0  = 无实质变更
10 = 有实质变更
20 = 数据异常或 diff 失败
"""
import os
import sys
import json
import argparse
from datetime import datetime

# 噪声字段，在递归比对时忽略
NOISE_KEYS = {"generated_at", "scrape_date"}

# 关键数值字段列表，用作类型校验
NUMERIC_FIELDS = {
    "daily_ridership_wan",
    "operating_lines",
    "lines_under_construction",
    "operating_stations",
    "operating_mileage_km",
    "ridership_intensity",
    "peak_ridership_wan"
}


def log(msg):
    print(msg, flush=True)


def load_json_file(path, errors_list):
    """
    加载 JSON 文件。如果读取或解析失败，将错误加入 errors_list。
    """
    if not os.path.exists(path):
        errors_list.append(f"文件不存在: {path}")
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        errors_list.append(f"JSON 解析失败 ({os.path.basename(path)}): {e}")
        return None
    except Exception as e:
        errors_list.append(f"读取文件失败 ({os.path.basename(path)}): {e}")
        return None


def strip_noise(data):
    """
    递归过滤所有层级中的噪声字段。
    """
    if isinstance(data, dict):
        return {k: strip_noise(v) for k, v in data.items() if k not in NOISE_KEYS}
    elif isinstance(data, list):
        return [strip_noise(item) for item in data]
    return data


def validate_snapshot_integrity(data, file_name, errors_list):
    """
    执行数据异常判定，若发现关键结构/类型异常则将错误信息记入 errors_list。
    """
    if data is None:
        return False

    if file_name in ["metro_stats.json", "city_assets_index.json"]:
        if "items" not in data:
            errors_list.append(f"{file_name} 缺少 items 字段")
            return False
        
        items = data["items"]
        if not isinstance(items, list):
            errors_list.append(f"{file_name} 中的 items 字段不是数组")
            return False

        # 校验重复 city 以及数值类型明显错误
        seen_cities = set()
        for idx, item in enumerate(items):
            if not isinstance(item, dict):
                errors_list.append(f"{file_name} items[{idx}] 不是对象")
                continue

            city = item.get("city")
            if not city:
                errors_list.append(f"{file_name} items[{idx}] 缺少 city 标识")
                continue

            if city in seen_cities:
                errors_list.append(f"{file_name} 中存在重复的城市记录: {city}")
            seen_cities.add(city)

            # 类型校验：critical numeric field
            for field in NUMERIC_FIELDS:
                if field in item:
                    val = item[field]
                    if val is not None and not isinstance(val, (int, float)):
                        errors_list.append(
                            f"{file_name} 城市 {city} 的关键数值字段 {field} 类型明显错误: "
                            f"期望为 number，实际为 {type(val).__name__} (值: {repr(val)})"
                        )

        # 校验城市总数底线
        if file_name == "metro_stats.json" and len(seen_cities) < 34:
            errors_list.append(f"新数据中 stats 城市数 ({len(seen_cities)}) 低于底线值 34")
        elif file_name == "city_assets_index.json" and len(seen_cities) < 50:
            errors_list.append(f"新数据中 asset 城市数 ({len(seen_cities)}) 低于底线值 50")

    elif file_name == "quality_report.json":
        for field in ["summary", "cities", "missing_groups"]:
            if field not in data:
                errors_list.append(f"{file_name} 缺少 {field} 字段")
                return False
        if not isinstance(data["cities"], list):
            errors_list.append(f"{file_name} 中的 cities 字段不是数组")
            return False
        if not isinstance(data["summary"], dict):
            errors_list.append(f"{file_name} 中的 summary 字段不是对象")
            return False
        if not isinstance(data["missing_groups"], dict):
            errors_list.append(f"{file_name} 中的 missing_groups 字段不是对象")
            return False
        if len(data["cities"]) < 50:
            errors_list.append(f"新数据中 quality_report cities 数 ({len(data['cities'])}) 低于底线值 50")

    return True


def diff_dict_value(before_val, after_val, keys_to_compare=None):
    """
    对比两个字典的特定字段，如果为 nested 类型如 yearly_avg_ridership，会剥离 noise 后直接进行 Deep Equivalence。
    返回存在变化的字段字典 {field: (before, after)}。
    """
    changes = {}
    b_stripped = strip_noise(before_val)
    a_stripped = strip_noise(after_val)

    if not isinstance(b_stripped, dict) or not isinstance(a_stripped, dict):
        if b_stripped != a_stripped:
            return {"_self": (before_val, after_val)}
        return {}

    keys = keys_to_compare if keys_to_compare else set(b_stripped.keys()) | set(a_stripped.keys())
    for k in keys:
        b_sub = b_stripped.get(k)
        a_sub = a_stripped.get(k)
        if b_sub != a_sub:
            # 返回原始未脱敏的数据，以便报告清晰可见时间戳等字段之外的具体差异
            changes[k] = (before_val.get(k), after_val.get(k))
    return changes


def compare_items_list(before_items, after_items, file_name, stats_city_map=None):
    """
    比较 metro_stats 或者是 city_assets 的 items 列表。
    通过 city 做 map 映射，输出实质变化清单。
    """
    changes = []
    
    # 建立 city 索引 map
    b_map = {item["city"]: item for item in before_items if "city" in item}
    a_map = {item["city"]: item for item in after_items if "city" in item}

    # 1. 检测城市新增或移除
    all_cities = sorted(set(b_map.keys()) | set(a_map.keys()))
    for city in all_cities:
        b_item = b_map.get(city)
        a_item = a_map.get(city)

        city_cn = None
        if a_item:
            city_cn = a_item.get("city_cn")
        elif b_item:
            city_cn = b_item.get("city_cn")
        
        # 如果 stats_city_map 提供了，优先用它补全 city_cn
        if not city_cn and stats_city_map and city in stats_city_map:
            city_cn = stats_city_map[city].get("city_cn")

        if not b_item:
            # 城市新增
            changes.append({
                "file": file_name,
                "city": city,
                "city_cn": city_cn,
                "field": "city",
                "before": None,
                "after": city,
                "change_type": "added"
            })
            continue
        elif not a_item:
            # 城市被移除
            changes.append({
                "file": file_name,
                "city": city,
                "city_cn": city_cn,
                "field": "city",
                "before": city,
                "after": None,
                "change_type": "removed"
            })
            continue

        # 2. 详细比对每个城市字段变化
        diffs = diff_dict_value(b_item, a_item)
        for field, (b_val, a_val) in diffs.items():
            changes.append({
                "file": file_name,
                "city": city,
                "city_cn": city_cn,
                "field": field,
                "before": b_val,
                "after": a_val,
                "change_type": "modified"
            })

    return changes


def compare_quality_report(before_quality, after_quality, stats_city_map=None):
    """
    比较 quality_report.json，分别比对 summary、missing_groups 和 cities 的变化。
    """
    changes = []
    if not before_quality or not after_quality:
        return changes

    # 1. 比对 summary 字段
    b_summary = before_quality.get("summary", {})
    a_summary = after_quality.get("summary", {})
    diffs_summary = diff_dict_value(b_summary, a_summary)
    for field, (b_val, a_val) in diffs_summary.items():
        changes.append({
            "file": "quality_report.json",
            "city": None,
            "city_cn": None,
            "field": f"summary.{field}",
            "before": b_val,
            "after": a_val,
            "change_type": "modified"
        })

    # 2. 比对 missing_groups
    b_groups = before_quality.get("missing_groups", {})
    a_groups = after_quality.get("missing_groups", {})
    diffs_groups = diff_dict_value(b_groups, a_groups)
    for field, (b_val, a_val) in diffs_groups.items():
        changes.append({
            "file": "quality_report.json",
            "city": None,
            "city_cn": None,
            "field": f"missing_groups.{field}",
            "before": b_val,
            "after": a_val,
            "change_type": "modified"
        })

    # 3. 比对 cities 列表中的各个城市字段
    b_cities = before_quality.get("cities", [])
    a_cities = after_quality.get("cities", [])
    
    b_map = {item["city"]: item for item in b_cities if "city" in item}
    a_map = {item["city"]: item for item in a_cities if "city" in item}

    all_cities = sorted(set(b_map.keys()) | set(a_map.keys()))
    for city in all_cities:
        b_item = b_map.get(city)
        a_item = a_map.get(city)

        city_cn = None
        if a_item:
            city_cn = a_item.get("city_cn")
        elif b_item:
            city_cn = b_item.get("city_cn")
        
        if not city_cn and stats_city_map and city in stats_city_map:
            city_cn = stats_city_map[city].get("city_cn")

        if not b_item:
            changes.append({
                "file": "quality_report.json",
                "city": city,
                "city_cn": city_cn,
                "field": "city",
                "before": None,
                "after": city,
                "change_type": "added"
            })
            continue
        elif not a_item:
            changes.append({
                "file": "quality_report.json",
                "city": city,
                "city_cn": city_cn,
                "field": "city",
                "before": city,
                "after": None,
                "change_type": "removed"
            })
            continue

        # 比对每一个属性变化，忽略 NOISE_KEYS
        diffs_city = diff_dict_value(b_item, a_item)
        for field, (b_val, a_val) in diffs_city.items():
            changes.append({
                "file": "quality_report.json",
                "city": city,
                "city_cn": city_cn,
                "field": field,
                "before": b_val,
                "after": a_val,
                "change_type": "modified"
            })

    return changes


def compare_manifest(before_manifest, after_manifest):
    """
    比较 manifest.json。忽略 generated_at / version / data_files 等，只比对指定核心指标。
    """
    changes = []
    if not before_manifest or not after_manifest:
        return changes

    manifest_keys = [
        "stats_city_count",
        "asset_city_count",
        "network_map_count",
        "plan_map_count",
        "yearly_trend_count",
        "no_daily_data_count",
        "no_daily_data_cities",
        "data_files"
    ]

    diffs = diff_dict_value(before_manifest, after_manifest, keys_to_compare=manifest_keys)
    for field, (b_val, a_val) in diffs.items():
        changes.append({
            "file": "manifest.json",
            "city": None,
            "city_cn": None,
            "field": field,
            "before": b_val,
            "after": a_val,
            "change_type": "modified"
        })

    return changes


def write_reports(json_path, md_path, status, changes, errors):
    """
    输出 JSON 报告和 Markdown 报告。
    """
    # 自动创建父目录
    for p in [json_path, md_path]:
        p_dir = os.path.dirname(os.path.abspath(p))
        os.makedirs(p_dir, exist_ok=True)

    # 1. 编译并写入 JSON 报告
    changed_files = sorted(list(set(c["file"] for c in changes)))
    changed_cities = sorted(list(set(c["city"] for c in changes if c.get("city"))))

    json_report = {
        "status": status,
        "summary": {
            "changed": len(changes) > 0,
            "error_count": len(errors),
            "changed_city_count": len(changed_cities),
            "changed_files": changed_files
        },
        "changes": changes,
        "errors": errors,
        "ignored_noise_fields": list(NOISE_KEYS)
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_report, f, ensure_ascii=False, indent=2)

    # 2. 编译并写入 Markdown 报告
    md_lines = ["# 数据快照差分报告", ""]
    
    if status == "error":
        md_lines.append("状态：**❌ 异常/校验失败**")
        md_lines.append("")
        md_lines.append("数据管道检测到格式、数值边界或类型异常，本次采集被**熔断**拦截，绝不能提 PR。")
        md_lines.append("")
        md_lines.append("## ❌ 错误列表 (Errors)")
        for err_msg in errors:
            md_lines.append(f"* {err_msg}")
    elif status == "changed":
        md_lines.append("状态：**🟢 发现实质变更**")
        md_lines.append("")
        md_lines.append("已自动检测到全国地铁数据与大屏资源的实质演进变化，需拉起自动 PR 流程。")
        md_lines.append("")
        md_lines.append("## 📊 变更摘要")
        md_lines.append(f"* **变更城市数**：`{len(changed_cities)}` 个城市")
        md_lines.append(f"* **变更文件**：{', '.join(f'`{f}`' for f in changed_files)}")
        md_lines.append("")
        md_lines.append("## 🔍 城市级变更明细")
        md_lines.append("| 文件 | 城市 | 字段 | 变更前 (Before) | 变更后 (After) | 变更类型 |")
        md_lines.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
        
        for c in changes:
            city_str = f"{c['city_cn']} (`{c['city']}`)" if c.get("city") else "—"
            field_str = f"`{c['field']}`"
            
            def fmt_val(v):
                if v is None:
                    return "*None*"
                if isinstance(v, (dict, list)):
                    return f"`{json.dumps(v, ensure_ascii=False)}`"
                return f"`{v}`"

            b_str = fmt_val(c["before"])
            a_str = fmt_val(c["after"])
            type_map = {"added": "🆕 新增", "removed": "🗑️ 移除", "modified": "✏️ 修改"}
            type_str = type_map.get(c["change_type"], c["change_type"])

            md_lines.append(
                f"| `{c['file']}` | {city_str} | {field_str} | {b_str} | {a_str} | {type_str} |"
            )
    else:
        md_lines.append("状态：**⚪ 无实质变更**")
        md_lines.append("")
        md_lines.append("仅检测到 `generated_at` / `scrape_date` 等时间戳噪声变化或内容完全一致。")
        md_lines.append("本轮自动更新无需生成 PR，跳过发布。")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines) + "\n")


def main():
    parser = argparse.ArgumentParser(description="Phase 6 自动化数据快照差分工具")
    parser.add_argument("--original", required=True, help="原始数据目录（通常为 data/latest）")
    parser.add_argument("--new", required=True, help="新采集的临时数据目录")
    parser.add_argument("--json-report", default="output/data_diff_report.json", help="JSON 报告输出路径")
    parser.add_argument("--md-report", default="output/data_diff_report.md", help="Markdown 报告输出路径")
    args = parser.parse_args()

    log("=" * 55)
    log(" 数据快照差分比对开始...")
    log(f" 原始目录: {args.original}")
    log(f" 新数据目录: {args.new}")
    log("=" * 55)

    errors = []
    changes = []

    # 1. 验证源目录是否存在
    for label, path in [("原始", args.original), ("新数据", args.new)]:
        if not os.path.exists(path) or not os.path.isdir(path):
            errors.append(f"{label}目录不存在或不是目录: {path}")

    if errors:
        log("Result: error")
        write_reports(args.json_report, args.md_report, "error", [], errors)
        sys.exit(20)

    # 2. 依次加载核心文件
    files_to_compare = ["metro_stats.json", "city_assets_index.json", "manifest.json", "quality_report.json"]
    b_data = {}
    a_data = {}

    for f_name in files_to_compare:
        b_path = os.path.join(args.original, f_name)
        a_path = os.path.join(args.new, f_name)

        # 加载
        if os.path.exists(b_path):
            b_data[f_name] = load_json_file(b_path, errors)
        if os.path.exists(a_path):
            a_data[f_name] = load_json_file(a_path, errors)

    # 如果有任何解析或读取 JSON 的致命错误，直接熔断
    if errors:
        log("Result: error")
        write_reports(args.json_report, args.md_report, "error", [], errors)
        sys.exit(20)

    # 3. 对新数据文件做完整性与边界熔断判定
    for f_name in files_to_compare:
        if f_name in a_data:
            validate_snapshot_integrity(a_data[f_name], f_name, errors)

    # 如果边界值或类型校验发现异常，触发熔断
    if errors:
        log("Result: error")
        write_reports(args.json_report, args.md_report, "error", [], errors)
        sys.exit(20)

    # 4. 执行多维差分比较
    # 首先从 metro_stats 中提取 city 到 city_cn 的映射，用以优化 assets 和 manifest 比对时的中文可读性
    stats_city_map = {}
    if "metro_stats.json" in b_data and b_data["metro_stats.json"]:
        for item in b_data["metro_stats.json"].get("items", []):
            if "city" in item:
                stats_city_map[item["city"]] = item
    if "metro_stats.json" in a_data and a_data["metro_stats.json"]:
        for item in a_data["metro_stats.json"].get("items", []):
            if "city" in item:
                stats_city_map[item["city"]] = item

    # 比对 metro_stats.json
    if "metro_stats.json" in b_data or "metro_stats.json" in a_data:
        b_items = b_data.get("metro_stats.json", {}).get("items", []) if b_data.get("metro_stats.json") else []
        a_items = a_data.get("metro_stats.json", {}).get("items", []) if a_data.get("metro_stats.json") else []
        changes.extend(compare_items_list(b_items, a_items, "metro_stats.json", stats_city_map))

    # 比对 city_assets_index.json
    if "city_assets_index.json" in b_data or "city_assets_index.json" in a_data:
        b_items = b_data.get("city_assets_index.json", {}).get("items", []) if b_data.get("city_assets_index.json") else []
        a_items = a_data.get("city_assets_index.json", {}).get("items", []) if a_data.get("city_assets_index.json") else []
        changes.extend(compare_items_list(b_items, a_items, "city_assets_index.json", stats_city_map))

    # 比对 manifest.json
    if "manifest.json" in b_data or "manifest.json" in a_data:
        changes.extend(compare_manifest(b_data.get("manifest.json"), a_data.get("manifest.json")))

    # 比对 quality_report.json
    if "quality_report.json" in b_data or "quality_report.json" in a_data:
        changes.extend(compare_quality_report(b_data.get("quality_report.json"), a_data.get("quality_report.json"), stats_city_map))

    # 5. 输出结论与 exit code
    if changes:
        log("Result: changed")
        write_reports(args.json_report, args.md_report, "changed", changes, [])
        log(f" JSON 报告: {args.json_report}")
        log(f" Markdown 报告: {args.md_report}")
        log("=" * 55)
        sys.exit(10)
    else:
        log("Result: unchanged")
        write_reports(args.json_report, args.md_report, "unchanged", [], [])
        log(f" JSON 报告: {args.json_report}")
        log(f" Markdown 报告: {args.md_report}")
        log("=" * 55)
        sys.exit(0)


if __name__ == "__main__":
    main()
