"""数据快照归档处理器：把 data/latest 的 JSON 层按采集月份存入 data/history/。

目的：
1. 对冲上游（MetroDB.org）失效风险——历史快照即存粮；
2. 为后续"历年对比"功能储备数据地基。
幂等：目标月份已归档过则跳过，不重复写入。
仅归档 JSON（每份 ~30KB），不归档图片资源。
"""
import json
import os
import shutil

from pipeline.config import DATA_LATEST_DIR, ROOT as DEFAULT_ROOT

ARCHIVED_FILES = [
    "metro_stats.json",
    "city_assets_index.json",
    "manifest.json",
    "quality_report.json",
]


def resolve_archive_month(data_dir: str) -> str | None:
    """从 manifest 的 stats_scrape_date 解析归档月份（YYYY-MM）。"""
    manifest_path = os.path.join(data_dir, "manifest.json")
    if not os.path.exists(manifest_path):
        return None
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    except (json.JSONDecodeError, OSError):
        return None
    scrape_date = manifest.get("stats_scrape_date")
    if not isinstance(scrape_date, str) or len(scrape_date) < 7:
        return None
    return scrape_date[:7]


def archive_latest(data_dir: str = None, root: str = DEFAULT_ROOT) -> dict:
    """归档 data/latest 四个 JSON 到 data/history/<YYYY-MM>/。

    返回 {"archived": bool, "month": str|None, "dest": str|None}
    """
    data_dir = data_dir or os.path.join(root, "data", "latest")
    month = resolve_archive_month(data_dir)
    if not month:
        return {"archived": False, "month": None, "dest": None}

    dest = os.path.join(root, "data", "history", month)
    if os.path.exists(os.path.join(dest, "manifest.json")):
        # 幂等：该月已有归档
        return {"archived": False, "month": month, "dest": dest}

    os.makedirs(dest, exist_ok=True)
    for name in ARCHIVED_FILES:
        src = os.path.join(data_dir, name)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(dest, name))

    return {"archived": True, "month": month, "dest": dest}
