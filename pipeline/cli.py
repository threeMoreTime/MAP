"""管线 CLI 入口: python -m pipeline.cli <subcommand>

子命令:
  build-index      扫描 cities/ 重建 data/latest 索引 + schema + 质量报告
  validate         校验 data/latest 数据层（CI 防线）
  quality-report   单独生成质量报告
  optimize-images  cities/ PNG → WebP 转换
  all              build-index + validate 一条龙
"""
import argparse
import os
import sys

from pipeline.config import DATA_LATEST_DIR, ROOT
from pipeline.processors import archiver, image_optimizer, index_builder, quality_auditor
from pipeline.validators import schema_validator


def cmd_build_index(args) -> int:
    print("=" * 50)
    print(" 数据索引构建 (pipeline)")
    print("=" * 50)
    summary = index_builder.build_all(root=ROOT)
    print(f"扫描城市目录: {summary['city_dirs']} 个")
    print(f"  Stats JSON:     {summary['stats_cities']}")
    print(f"  线路图:         {summary['network_maps']}")
    print(f"  规划图:         {summary['plan_maps']}")
    print(f"  年度趋势图:     {summary['yearly_trends']}")

    print("正在同步生成 quality_report.json ...")
    quality_auditor.build_and_write(
        os.path.join(ROOT, "data", "latest"),
        os.path.join(ROOT, "data", "latest", "quality_report.json"),
        root=ROOT,
    )

    no_daily = summary["no_daily"]
    print("-" * 50)
    print(f"  缺失日客流:     {len(no_daily)} 个城市")
    if no_daily:
        print(f"    {', '.join(no_daily)}")
    print("-" * 50)
    print("完成!")
    return 0


def cmd_validate(args) -> int:
    data_dir = args.data_dir
    print("=" * 50)
    print(" 数据校验 (pipeline)")
    print(f" 校验目录: {data_dir}")
    print("=" * 50)

    result = schema_validator.run(data_dir, root=ROOT)

    print(f"\n  Errors:   {len(result.errors)}")
    print(f"  Warnings: {len(result.warnings)}")
    for msg in result.errors:
        print(f"  [ERROR] {msg}")
    for msg in result.warnings:
        print(f"  [WARN]  {msg}")
    print("-" * 50)
    print("结果: PASS" if result.ok else "结果: FAIL")
    return 0 if result.ok else 1


def cmd_quality_report(args) -> int:
    data_dir = args.data_dir
    output = args.output or os.path.join(data_dir, "quality_report.json")
    try:
        quality_auditor.build_and_write(data_dir, output, root=ROOT)
        print("质量报告生成逻辑完成！")
        return 0
    except Exception as e:
        print(f"[FATAL] 生成质量报告发生致命错误: {e}")
        return 1


def cmd_optimize_images(args) -> int:
    cities_dir = os.path.join(ROOT, "cities")
    print("=" * 50)
    print(f" 图片优化 PNG → WebP (quality={args.quality}, dry_run={args.dry_run})")
    print(f" 目录: {cities_dir}")
    print("=" * 50)
    stats = image_optimizer.convert_dir_images(
        cities_dir, quality=args.quality, dry_run=args.dry_run
    )
    before_mb = stats["bytes_before"] / 1024 / 1024
    after_mb = stats["bytes_after"] / 1024 / 1024
    print(f"  转换: {stats['converted']} 张，跳过: {stats['skipped']} 张")
    print(f"  体积: {before_mb:.1f} MB → {after_mb:.1f} MB"
          f"（缩减 {(1 - after_mb / before_mb) * 100:.0f}%）" if before_mb else "  无体积变化")
    if not args.dry_run and stats["converted"]:
        print("提示: 请随后执行 build-index 重建索引以指向 .webp 路径")
    return 0


def cmd_archive(args) -> int:
    data_dir = args.data_dir or os.path.join(ROOT, "data", "latest")
    result = archiver.archive_latest(data_dir, root=ROOT)
    if result["month"] is None:
        print("[WARN] 无法从 manifest 解析 stats_scrape_date，跳过归档")
        return 1
    if result["archived"]:
        print(f"已归档 {result['month']} 快照 → {result['dest']}")
    else:
        print(f"{result['month']} 快照已存在，跳过（幂等）")
    return 0


def cmd_all(args) -> int:
    rc = cmd_build_index(args)
    if rc != 0:
        return rc
    args.data_dir = os.path.join(ROOT, "data", "latest")
    return cmd_validate(args)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="pipeline", description="MAP 数据管线")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("build-index", help="扫描 cities/ 重建数据层索引")

    p_validate = sub.add_parser("validate", help="校验 data/latest 数据层")
    p_validate.add_argument("--data-dir", default=DATA_LATEST_DIR,
                            help="要校验的数据目录，默认 data/latest")

    p_quality = sub.add_parser("quality-report", help="生成质量报告")
    p_quality.add_argument("--data-dir", default=DATA_LATEST_DIR)
    p_quality.add_argument("--output", default=None)

    p_optimize = sub.add_parser("optimize-images", help="cities PNG → WebP")
    p_optimize.add_argument("--quality", type=int, default=85)
    p_optimize.add_argument("--dry-run", action="store_true")

    p_archive = sub.add_parser("archive", help="按采集月归档 data/latest 到 data/history/")
    p_archive.add_argument("--data-dir", default=None)

    sub.add_parser("all", help="build-index + validate")

    args = parser.parse_args(argv)

    handlers = {
        "build-index": cmd_build_index,
        "validate": cmd_validate,
        "quality-report": cmd_quality_report,
        "optimize-images": cmd_optimize_images,
        "archive": cmd_archive,
        "all": cmd_all,
    }
    return handlers[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
