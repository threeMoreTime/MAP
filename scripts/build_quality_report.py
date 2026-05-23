#!/usr/bin/env python3
"""
scripts/build_quality_report.py
数据质量报告生成脚本
根据 metro_stats.json、city_assets_index.json 和 cover manifest 自动评估数据收录完整度。
支持 Windows / Linux 路径，且具备 generated_at 防噪写入保护。
"""
import os
import sys
import json
import argparse
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def log(msg):
    print(msg, flush=True)


def iso_now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def strip_generated_at(obj):
    if isinstance(obj, dict):
        return {k: v for k, v in obj.items() if k != "generated_at"}
    return obj


def write_json_if_changed(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    new_text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                old_text = f.read()
            if strip_generated_at(json.loads(old_text)) == strip_generated_at(data):
                return False
        except Exception:
            pass
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_text)
    return True


def build_and_write(data_dir, output_path):
    log(f"开始生成质量报告...")
    log(f"  输入数据目录: {data_dir}")
    log(f"  输出报告路径: {output_path}")

    stats_path = os.path.join(data_dir, "metro_stats.json")
    assets_path = os.path.join(data_dir, "city_assets_index.json")
    covers_path = os.path.join(ROOT, "assets", "city-covers", "manifest.json")

    # 1. 强力加载输入数据，缺失直接抛异常使构建失败
    if not os.path.exists(stats_path):
        raise FileNotFoundError(f"缺失必要构建数据文件: {stats_path}")
    if not os.path.exists(assets_path):
        raise FileNotFoundError(f"缺失必要构建数据文件: {assets_path}")

    with open(stats_path, "r", encoding="utf-8") as f:
        stats_data = json.load(f)
    with open(assets_path, "r", encoding="utf-8") as f:
        assets_data = json.load(f)

    # 封面图 manifest 加载（非必要，支持降级为 unknown 写入）
    covers_data = None
    if os.path.exists(covers_path):
        try:
            with open(covers_path, "r", encoding="utf-8") as f:
                covers_data = json.load(f)
            log("  成功读取 covers manifest。")
        except Exception as e:
            log(f"  [WARN] 读取 covers manifest 失败，将降级处理: {e}")

    # 2. 建立索引映射
    stats_map = {item["city"]: item for item in stats_data.get("items", [])}
    assets_map = {item["city"]: item for item in assets_data.get("items", [])}
    covers_map = {}
    if covers_data and "items" in covers_data:
        covers_map = {item["city"]: item for item in covers_data["items"]}

    all_cities = [item["city"] for item in assets_data.get("items", [])]

    # 3. 总体汇总度计数初始化
    stats_city_count = 0
    daily_ridership_display_count = 0
    no_daily_display_count = 0
    stats_without_daily_count = 0
    no_stats_count = 0
    network_map_count = 0
    plan_map_count = 0
    cover_downloaded_count = 0
    cover_fallback_count = 0
    high_quality_count = 0
    medium_quality_count = 0
    low_quality_count = 0

    cities_reports = []
    missing_no_stats = []
    missing_no_daily = []
    missing_no_network = []
    missing_no_plan = []
    missing_cover_fallback = []

    # 4. 逐个城市计算
    for city in all_cities:
        s_item = stats_map.get(city)
        a_item = assets_map.get(city)
        c_item = covers_map.get(city)

        city_cn = a_item.get("city_cn", city) if a_item else (s_item.get("city_cn", city) if s_item else city)

        has_stats = s_item is not None
        has_daily_ridership = False
        has_yearly_trend = False
        operating_complete = False

        if has_stats:
            stats_city_count += 1
            daily = s_item.get("daily_ridership_wan", 0)
            if daily > 0:
                has_daily_ridership = True
                daily_ridership_display_count += 1
            else:
                stats_without_daily_count += 1
                missing_no_daily.append(city)
                
            yearly = s_item.get("yearly_avg_ridership")
            if yearly and len(yearly.get("years", [])) > 0:
                has_yearly_trend = True
                
            op_lines = s_item.get("operating_lines", 0)
            op_stations = s_item.get("operating_stations", 0)
            op_mileage = s_item.get("operating_mileage_km", 0)
            if op_lines > 0 and op_stations > 0 and op_mileage > 0:
                operating_complete = True
        else:
            no_stats_count += 1
            missing_no_stats.append(city)
            missing_no_daily.append(city)

        has_network_map = a_item.get("has_network_map", False) if a_item else False
        if has_network_map:
            network_map_count += 1
        else:
            missing_no_network.append(city)

        has_plan_map = a_item.get("has_plan_map", False) if a_item else False
        if has_plan_map:
            plan_map_count += 1
        else:
            missing_no_plan.append(city)

        # 封面图判定
        cover_status = "unknown"
        if c_item:
            cover_status = c_item.get("status", "unknown")
        elif city == "hohhot":
            cover_status = "fallback"

        if cover_status == "downloaded":
            cover_downloaded_count += 1
        elif cover_status == "fallback":
            cover_fallback_count += 1
            missing_cover_fallback.append(city)
        else:
            missing_cover_fallback.append(city)

        # 评分计算 (满分 100)
        score = 0
        if has_stats:
            score += 20
        if has_daily_ridership:
            score += 20
        if has_yearly_trend:
            score += 15
        if has_network_map:
            score += 15
        if has_plan_map:
            score += 15
        if cover_status == "downloaded":
            score += 10
        if operating_complete:
            score += 5

        # 完整度等级
        if score >= 85:
            level = "high"
            high_quality_count += 1
        elif score >= 60:
            level = "medium"
            medium_quality_count += 1
        else:
            level = "low"
            low_quality_count += 1

        # 收集缺陷与警示
        missing_items = []
        warnings = []
        risk_flags = []

        if not has_stats:
            missing_items.append("收录统计数据")
        else:
            if not has_daily_ridership:
                missing_items.append("日客流展示数据")
                warnings.append("暂无日客流展示值，处于日常采集中")
            if not has_yearly_trend:
                missing_items.append("年度均值趋势数据")
            if not operating_complete:
                missing_items.append("基础运营指标(线路/站点/里程)")

            # 基础指标异常检查
            if s_item.get("operating_mileage_km", 0) <= 0 and s_item.get("operating_lines", 0) > 0:
                risk_flags.append("运营里程异常为零或缺失")
            if s_item.get("operating_stations", 0) <= 0 and s_item.get("operating_lines", 0) > 0:
                risk_flags.append("运营站点数异常为零")

        if not has_network_map:
            missing_items.append("地铁线路图")
        if not has_plan_map:
            missing_items.append("地铁规划图")
        if cover_status != "downloaded":
            missing_items.append("高清封面图片")
            if cover_status == "fallback":
                risk_flags.append("封面图片缺损降级")

        cities_reports.append({
            "city": city,
            "city_cn": city_cn,
            "quality_score": score,
            "quality_level": level,
            "has_stats": has_stats,
            "has_daily_ridership": has_daily_ridership,
            "has_yearly_trend": has_yearly_trend,
            "has_network_map": has_network_map,
            "has_plan_map": has_plan_map,
            "cover_status": cover_status,
            "missing_items": missing_items,
            "warnings": warnings,
            "risk_flags": risk_flags
        })

    # 5. 组装数据结构
    no_daily_display_count = len(all_cities) - daily_ridership_display_count

    report = {
        "schema_version": "quality-report.v1",
        "generated_at": iso_now(),
        "summary": {
            "city_count": len(all_cities),
            "stats_city_count": stats_city_count,
            "daily_ridership_display_count": daily_ridership_display_count,
            "no_daily_display_count": no_daily_display_count,
            "stats_without_daily_count": stats_without_daily_count,
            "no_stats_count": no_stats_count,
            "network_map_count": network_map_count,
            "plan_map_count": plan_map_count,
            "cover_downloaded_count": cover_downloaded_count,
            "cover_fallback_count": cover_fallback_count,
            "high_quality_count": high_quality_count,
            "medium_quality_count": medium_quality_count,
            "low_quality_count": low_quality_count
        },
        "cities": sorted(cities_reports, key=lambda x: x["quality_score"], reverse=True),
        "missing_groups": {
            "no_stats": sorted(missing_no_stats),
            "no_daily_ridership": sorted(missing_no_daily),
            "no_network_map": sorted(missing_no_network),
            "no_plan_map": sorted(missing_no_plan),
            "cover_fallback": sorted(missing_cover_fallback)
        }
    }

    # 6. 防噪安全写入
    changed = write_json_if_changed(output_path, report)
    log(f"  质量报告写入状态: {'[UPDATED] 更新' if changed else '[UNCHANGED] 对齐跳过'}")
    return changed


def main():
    parser = argparse.ArgumentParser(description="自动化数据收录质量报告生成工具")
    parser.add_argument("--data-dir", default=os.path.join(ROOT, "data", "latest"), help="输入汇总数据所在目录")
    parser.add_argument("--output", default=None, help="输出报告的物理路径")
    args = parser.parse_args()

    data_dir = args.data_dir
    output_path = args.output if args.output else os.path.join(data_dir, "quality_report.json")

    try:
        build_and_write(data_dir, output_path)
        log("质量报告生成逻辑完成！")
    except Exception as e:
        log(f"[FATAL] 生成质量报告发生致命错误: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
