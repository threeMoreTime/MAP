#!/usr/bin/env python3
"""数据鲜活度门禁：校验 data/latest 的 stats_scrape_date 距今天数。

用法:
    python scripts/check_freshness.py [--max-age-days 45] [--data-dir DIR]

退出码:
    0  数据新鲜（或未知但未启用严格模式）
    1  数据超过阈值（CI 红灯信号）
    2  manifest 缺失/损坏（视为失败）

设计动机：上游 MetroDB 失效或 GitHub 静默禁用月度更新时，数据会停在旧日期。
该门禁把"数据过期"变成 push 时即可见的红灯，而非无人知晓的静默腐化。
"""
import argparse
import json
import os
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def parse_scrape_date(value):
    if not isinstance(value, str) or len(value) < 10:
        return None
    try:
        parts = [int(x) for x in value[:10].split("-")]
        return date(parts[0], parts[1], parts[2])
    except (ValueError, IndexError):
        return None


def main():
    parser = argparse.ArgumentParser(description="数据鲜活度门禁")
    parser.add_argument("--max-age-days", type=int, default=45)
    parser.add_argument("--data-dir", default=os.path.join(ROOT, "data", "latest"))
    args = parser.parse_args()

    manifest_path = os.path.join(args.data_dir, "manifest.json")
    if not os.path.exists(manifest_path):
        print(f"[FATAL] manifest 不存在: {manifest_path}")
        sys.exit(2)
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"[FATAL] manifest 解析失败: {e}")
        sys.exit(2)

    scrape = parse_scrape_date(manifest.get("stats_scrape_date"))
    if scrape is None:
        print("[WARN] manifest 无有效 stats_scrape_date，无法判断鲜活度，按失败处理")
        sys.exit(2)

    age_days = (date.today() - scrape).days
    print(f"数据采集日: {scrape.isoformat()}  距今: {age_days} 天  阈值: {args.max_age_days} 天")

    # 供 CI 后续步骤引用
    if "GITHUB_OUTPUT" in os.environ:
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as f:
            f.write(f"days={age_days}\n")
            f.write(f"scrape_date={scrape.isoformat()}\n")

    if age_days > args.max_age_days:
        print(f"[FAIL] 数据已过期 {age_days} 天（>{args.max_age_days}）。"
              f"请运行 data-update workflow（write 模式）刷新数据后合并 PR。")
        sys.exit(1)

    print("[PASS] 数据鲜活度正常")
    sys.exit(0)


if __name__ == "__main__":
    main()
