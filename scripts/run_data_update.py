#!/usr/bin/env python3
"""
scripts/run_data_update.py
MAP 数据更新总控编排脚本
支持本地 dry-run 演练和有二次确认保护的真实 write 写入模式。
"""
import os
import sys
import shutil
import json
import subprocess
import argparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_LATEST_DIR = os.path.join(ROOT, "data", "latest")
CITIES_DIR = os.path.join(ROOT, "cities")


def log(msg):
    print(msg, flush=True)


def clean_and_recreate_dir(path):
    if os.path.exists(path):
        shutil.rmtree(path)
    os.makedirs(path, exist_ok=True)


def copy_cities_stats_only(src_cities, dest_cities):
    """
    仅复制城市 stats.json，不复制 PNG 等大图片资源，以极速且轻量地建立 staging 结构。
    """
    if not os.path.exists(src_cities):
        return
    for name in os.listdir(src_cities):
        src_city_dir = os.path.join(src_cities, name)
        if os.path.isdir(src_city_dir) and not name.startswith("."):
            dest_city_dir = os.path.join(dest_cities, name)
            stats_file = f"{name}_stats.json"
            src_stats_path = os.path.join(src_city_dir, stats_file)
            if os.path.exists(src_stats_path):
                os.makedirs(dest_city_dir, exist_ok=True)
                shutil.copy2(src_stats_path, os.path.join(dest_city_dir, stats_file))


def copy_latest_files(src_latest, dest_staging):
    """
    复制 data/latest/ 下的三个关键 json 汇总文件。
    """
    for f_name in ["metro_stats.json", "city_assets_index.json", "manifest.json"]:
        src_path = os.path.join(src_latest, f_name)
        if os.path.exists(src_path):
            shutil.copy2(src_path, os.path.join(dest_staging, f_name))


def apply_staging_to_source(staging_cities_dir, real_cities_dir):
    """
    将 staging/cities/ 中的变更 stats.json 文件物理覆盖写入到真正的 cities/ 目录下。
    """
    if not os.path.exists(staging_cities_dir):
        return
    for name in os.listdir(staging_cities_dir):
        staging_city_dir = os.path.join(staging_cities_dir, name)
        if os.path.isdir(staging_city_dir) and not name.startswith("."):
            stats_file = f"{name}_stats.json"
            staging_stats_path = os.path.join(staging_city_dir, stats_file)
            if os.path.exists(staging_stats_path):
                real_city_dir = os.path.join(real_cities_dir, name)
                os.makedirs(real_city_dir, exist_ok=True)
                shutil.copy2(staging_stats_path, os.path.join(real_city_dir, stats_file))


def main():
    parser = argparse.ArgumentParser(description="MAP 数据增量更新与自动采集本地总控编排")
    parser.add_argument("--dry-run", action="store_true", help="默认无副作用演练模式，仅物理操作 Staging 沙盒")
    parser.add_argument("--write", action="store_true", help="真实覆写模式，将 Staging 结果更新到主干中")
    parser.add_argument("--confirm-write", action="store_true", help="真实覆写二次确认保护闸")
    parser.add_argument("--staging-dir", default=os.path.join(ROOT, "output", "data-update-staging"), help=" Staging 目录位置")
    parser.add_argument("--skip-scrape", action="store_true", help="跳过外部网络数据爬取")
    parser.add_argument("--use-current-data", action="store_true", help="拷贝当前真实数据作为 Staging 数据，不调用爬虫")
    parser.add_argument("--json-report", default=os.path.join(ROOT, "output", "data_diff_report.json"), help=" JSON 格式差分报告输出路径")
    parser.add_argument("--md-report", default=os.path.join(ROOT, "output", "data_diff_report.md"), help=" Markdown 格式差分报告输出路径")

    args = parser.parse_args()

    # 确定运行模式：未传 write 时，强制默认为 dry-run 模式以保障安全
    is_write_mode = args.write
    is_dry_run = not is_write_mode or args.dry_run

    log("=" * 60)
    log(" MAP 数据增量更新总控编排启动...")
    log(f" 运行模式: {'[WRITE] 真实覆写' if is_write_mode else '[DRY-RUN] 无副作用演练'}")
    log(f" Staging 目录: {args.staging_dir}")
    log("=" * 60)

    # 1. 安全保护：write 模式强制要求 confirm-write
    if is_write_mode:
        if not args.confirm_write:
            log("[ERROR] write 模式必须显式传入 --confirm-write 保护闸！")
            sys.exit(20)

    # 2. 清理并重建 Staging 沙盒
    staging_dir = args.staging_dir
    staging_cities_dir = os.path.join(staging_dir, "cities")
    clean_and_recreate_dir(staging_dir)
    os.makedirs(staging_cities_dir, exist_ok=True)

    # 3. 填充基础数据到 Staging 城市目录（全量城市，为增量修改做好基准准备）
    copy_cities_stats_only(CITIES_DIR, staging_cities_dir)

    # 4. 采集或模拟生成 Staging 数据
    if args.use_current_data:
        log("[INFO] 正在拷贝当前物理数据模拟无变更场景...")
        copy_latest_files(DATA_LATEST_DIR, staging_dir)
    else:
        if not args.skip_scrape:
            log("[INFO] 启动外部爬虫写入沙盒隔离区...")
            scrape_script = os.path.join(ROOT, "scrapers", "scrape_metrodb.py")
            cmd_scrape = [sys.executable, scrape_script, "--output-dir", staging_cities_dir]
            res_scrape = subprocess.run(cmd_scrape)
            if res_scrape.returncode != 0:
                log(f"[WARN] 外部爬虫爬取部分异常，错误码: {res_scrape.returncode}，将基于现有局部成功结果继续校验")
        else:
            log("[INFO] 已选择跳过网络爬虫爬取，直接基于现有本地数据生成")

        # 5. 调用 pipeline 索引构建逻辑对 Staging 数据进行编译汇总（路径参数化，无需 monkey patch）
        log("[INFO] 正在编译汇总 Staging 数据...")
        from pipeline.processors import index_builder

        cities_list = index_builder.scan_city_dirs(staging_cities_dir)
        stats, no_daily = index_builder.build_metro_stats(cities_list, staging_cities_dir)
        assets = index_builder.build_city_assets_index(cities_list, staging_cities_dir, ROOT)
        manifest = index_builder.build_manifest(stats, assets)

        # 5.1 城市骤降熔断：上游改版/反爬导致大面积解析失败时，阻止坏数据进入后续流程
        current_stats_path = os.path.join(DATA_LATEST_DIR, "metro_stats.json")
        if os.path.exists(current_stats_path):
            with open(current_stats_path, "r", encoding="utf-8") as f:
                old_count = json.load(f).get("city_count", 0)
            new_count = stats["city_count"]
            if old_count > 0 and new_count < old_count * 0.8:
                log(f"[FATAL] 城市骤降熔断触发：新数据仅 {new_count} 城（原有 {old_count} 城，"
                    f"保留率 {new_count / old_count * 100:.0f}% < 80%）。疑似上游结构变更或大面积反爬，"
                    f"本次更新强制阻断，请人工检查爬虫解析逻辑。")
                sys.exit(30)
            log(f"[PASS] 城市数量门禁: {new_count}/{old_count} 城")

        # 将内存中计算的 Staging 汇总写入到沙盒
        with open(os.path.join(staging_dir, "metro_stats.json"), "w", encoding="utf-8") as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        with open(os.path.join(staging_dir, "city_assets_index.json"), "w", encoding="utf-8") as f:
            json.dump(assets, f, ensure_ascii=False, indent=2)
        with open(os.path.join(staging_dir, "manifest.json"), "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)

    # 6. 调用 pipeline 校验器进行 Staging 沙盒校验
    log("[INFO] 正在执行 Staging 目录格式与边界强校验...")
    cmd_validate = [sys.executable, "-m", "pipeline.cli", "validate", "--data-dir", staging_dir]
    res_validate = subprocess.run(cmd_validate, cwd=ROOT)
    if res_validate.returncode != 0:
        log("[ERROR] Staging 数据校验失败！本次更新被强行阻断熔断。")
        sys.exit(20)
    log("[PASS] Staging 数据校验通过！")

    # 7. 调用 diff_data_snapshot.py 进行数据快照差分比对
    log("[INFO] 正在执行数据差分比对...")
    diff_script = os.path.join(ROOT, "scripts", "diff_data_snapshot.py")
    cmd_diff = [
        sys.executable, diff_script,
        "--original", DATA_LATEST_DIR,
        "--new", staging_dir,
        "--json-report", args.json_report,
        "--md-report", args.md_report
    ]
    res_diff = subprocess.run(cmd_diff)
    diff_exit = res_diff.returncode

    log("-" * 60)
    log(f" 差分退出码: {diff_exit}")
    
    # 8. 根据差分结果进行分发路由
    if diff_exit == 0:
        log("[结论] 数据无任何实质性变更，无需任何发布。")
        if is_write_mode:
            log("[INFO] 本地数据无变更，无需覆盖真实源文件。")
        sys.exit(0)
        
    elif diff_exit == 10:
        log("[结论] 检测到实质性数据变更！")
        if is_write_mode:
            # 真实覆盖物理源文件与全量索引构建
            log("[INFO] 发现数据有实质变更，正在向主干 physical 覆写...")
            apply_staging_to_source(staging_cities_dir, CITIES_DIR)
            
            # 重新构建物理 data/latest 汇总目录
            log("[INFO] 正在重新构建物理最新索引...")
            res_build = subprocess.run([sys.executable, "-m", "pipeline.cli", "build-index"], cwd=ROOT)
            if res_build.returncode != 0:
                log("[ERROR] 物理索引重新构建失败！")
                sys.exit(20)

            # 二次验证真实物理目录
            log("[INFO] 正在对更新后的物理目录 data/latest 执行终极校验...")
            res_val_final = subprocess.run(
                [sys.executable, "-m", "pipeline.cli", "validate", "--data-dir", DATA_LATEST_DIR], cwd=ROOT
            )
            if res_val_final.returncode != 0:
                log("[ERROR] 更新后的物理目录校验失败，物理数据可能存在隐患！")
                sys.exit(20)
                
            log("[SUCCESS] write 模式安全执行完毕，真实数据已被安全物理覆写并校验全绿！")
            
            # 物理清理临时 Staging 沙盒
            clean_and_recreate_dir(staging_dir)
            sys.exit(0)
        else:
            log("[INFO] dry-run 模式演练结束，Staging 保存完好。")
            sys.exit(10)
            
    elif diff_exit == 20:
        log("[ERROR] 数据差分出现异常或熔断！")
        sys.exit(20)
        
    else:
        log(f"[ERROR] 发生非预期退出码: {diff_exit}")
        sys.exit(diff_exit)


if __name__ == "__main__":
    main()
