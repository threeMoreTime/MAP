"""staging 快照自洽回归测试（2026-08-01 data-update exit 20 根因）。

背景：staging 构建曾不生成 quality_report.json，且 staging 校验把 stats_path
相对生产仓库根解析，导致新增城市（如 foshan/shaoxing）报"资源路径不存在"、
manifest 引用 data/latest/quality_report.json 落空，staging validation
以 exit 20 阻断整条数据更新链路。

本文件锁定修复后的行为：
- staging 构建配方产出 validator 依赖的全部四个文件；
- stats_path 相对 staging 资源根解析，图片资产相对仓库根解析；
- staging 校验只基于 staging 快照自身，不偷读生产 data/latest 误 PASS。
"""
import json
import os
import shutil
import subprocess
import sys

import pytest

from pipeline.config import ROOT
from pipeline.processors import index_builder, quality_auditor
from pipeline.validators import schema_validator

STAGING_DATA_FILES = [
    "metro_stats.json",
    "city_assets_index.json",
    "manifest.json",
    "quality_report.json",
]


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


def city_stats(city, scrape_date="2026-08-01"):
    return {
        "city": city,
        "city_cn": city,
        "scrape_date": scrape_date,
        "operating_lines": 2,
        "operating_stations": 30,
        "operating_mileage_km": 30.0,
        "daily_ridership_wan": 50.0,
    }


@pytest.fixture
def fake_repo(tmp_path):
    """最小假仓库：生产 cities/ 有旧城市 alpha（stats+图片），data/latest 有完整四件套。"""
    root = tmp_path / "repo"
    img = root / "cities" / "alpha" / "alpha_network.png"
    img.parent.mkdir(parents=True)
    img.write_bytes(b"png")
    write_json(root / "cities" / "alpha" / "alpha_stats.json", city_stats("alpha", "2026-05-08"))

    latest = root / "data" / "latest"
    write_json(latest / "metro_stats.json", {
        "generated_at": "2026-05-08T00:00:00Z",
        "source": "metrodb.org",
        "city_count": 1,
        "no_daily_data_cities": [],
        "items": [city_stats("alpha", "2026-05-08")],
    })
    write_json(latest / "city_assets_index.json", {
        "generated_at": "2026-05-08T00:00:00Z",
        "city_count": 1,
        "items": [{
            "city": "alpha", "city_cn": "alpha", "dir": "alpha",
            "has_network_map": True, "network_map_path": "cities/alpha/alpha_network.png",
            "has_plan_map": False, "plan_map_path": None,
            "has_stats": True, "stats_path": "cities/alpha/alpha_stats.json",
            "has_yearly_trend": False, "yearly_trend_path": None,
        }],
    })
    write_json(latest / "manifest.json", {
        "generated_at": "2026-05-08T00:00:00Z",
        "version": "v1.0.0",
        "stats_scrape_date": "2026-05-08",
        "stats_city_count": 1,
        "asset_city_count": 1,
        "network_map_count": 1,
        "plan_map_count": 0,
        "yearly_trend_count": 0,
        "no_daily_data_count": 0,
        "no_daily_data_cities": [],
        "data_files": [
            "data/latest/metro_stats.json",
            "data/latest/city_assets_index.json",
            "data/latest/quality_report.json",
        ],
    })
    quality_auditor.build_and_write(str(latest), str(latest / "quality_report.json"), root=str(root))
    return root


def make_staging_city(staging_cities, city, scrape_date="2026-08-01"):
    city_dir = staging_cities / city
    city_dir.mkdir(parents=True)
    write_json(city_dir / f"{city}_stats.json", city_stats(city, scrape_date))


def build_staging_like_scraper(root, staging_dir, cities):
    """复刻 run_data_update.py 爬虫分支的 staging 构建配方：索引三件套 + quality_report。"""
    staging_cities = staging_dir / "cities"
    staging_cities.mkdir(parents=True)
    for city in cities:
        make_staging_city(staging_cities, city)

    cities_list = index_builder.scan_city_dirs(str(staging_cities))
    stats, _ = index_builder.build_metro_stats(cities_list, str(staging_cities))
    assets = index_builder.build_city_assets_index(cities_list, str(staging_cities), str(root))
    manifest = index_builder.build_manifest(stats, assets)

    write_json(staging_dir / "metro_stats.json", stats)
    write_json(staging_dir / "city_assets_index.json", assets)
    write_json(staging_dir / "manifest.json", manifest)
    quality_auditor.build_and_write(str(staging_dir), str(staging_dir / "quality_report.json"), root=str(root))
    return staging_dir


class TestStagingBuildSelfContained:
    """Case 1: staging 构建生成 validator 所需的全部派生产物。"""

    def test_staging_build_produces_quality_report(self, fake_repo, tmp_path):
        staging = build_staging_like_scraper(
            fake_repo, tmp_path / "staging", ["alpha", "beta"]
        )
        for file_name in STAGING_DATA_FILES:
            assert (staging / file_name).exists(), f"staging 缺少 {file_name}"

    def test_manifest_data_files_resolve_inside_staging(self, fake_repo, tmp_path):
        """Case 3: manifest 声明的全部 data_files 在 staging 快照内确实存在。"""
        staging = build_staging_like_scraper(
            fake_repo, tmp_path / "staging", ["alpha", "beta"]
        )
        manifest = json.loads((staging / "manifest.json").read_text(encoding="utf-8"))
        for data_file in manifest["data_files"]:
            resolved = schema_validator.resolve_manifest_data_file_path(
                data_file, str(staging), root=str(fake_repo)
            )
            assert os.path.exists(resolved), f"data_file 未落在 staging 内: {data_file}"


class TestStagingValidationPathResolution:
    """Case 2: staging 的 city_assets_index 路径在 staging validation 模式下正确解析。"""

    def test_stats_path_resolves_against_staging_root(self, fake_repo, tmp_path):
        # 新城市 beta 只有 staging 内的 stats（生产 cities/beta 不存在）
        staging = build_staging_like_scraper(
            fake_repo, tmp_path / "staging", ["alpha", "beta"]
        )
        assert not (fake_repo / "cities" / "beta").exists()

        result = schema_validator.run(str(staging), root=str(fake_repo), stats_root=str(staging))
        assert result.ok, f"staging 校验应通过: {result.errors}"

    def test_without_stats_root_new_city_stats_path_fails(self, fake_repo, tmp_path):
        # 语义对照：不传 stats_root（生产模式）时，staging 新城市 stats_path 打到生产仓库根 → FAIL
        staging = build_staging_like_scraper(
            fake_repo, tmp_path / "staging", ["alpha", "beta"]
        )
        result = schema_validator.run(str(staging), root=str(fake_repo))
        assert any("cities/beta/beta_stats.json" in e for e in result.errors), \
            f"应报 beta stats 路径错误: {result.errors}"

    def test_image_paths_resolve_against_repo_root(self, fake_repo, tmp_path):
        # 图片资产相对仓库根解析：staging 未复制 alpha 图片，但生产有 → 不报错
        staging = build_staging_like_scraper(
            fake_repo, tmp_path / "staging", ["alpha"]
        )
        assert not (staging / "cities" / "alpha" / "alpha_network.png").exists()
        result = schema_validator.run(str(staging), root=str(fake_repo), stats_root=str(staging))
        assert result.ok, f"图片路径应相对仓库根解析: {result.errors}"


class TestStagingValidationReadsOnlyStaging:
    """Case 4: staging validation 不会偷偷读取生产 data/latest 后误 PASS。"""

    def test_missing_quality_report_fails_even_if_production_has_one(self, fake_repo, tmp_path):
        staging = build_staging_like_scraper(
            fake_repo, tmp_path / "staging", ["alpha", "beta"]
        )
        # 生产 data/latest 有完整 quality_report；staging 刻意缺失 → 校验必须 FAIL
        (staging / "quality_report.json").unlink()
        result = schema_validator.run(str(staging), root=str(fake_repo), stats_root=str(staging))
        assert not result.ok
        assert any("quality_report" in e for e in result.errors), \
            f"应报 quality_report 缺失而非偷读生产: {result.errors}"


class TestDataUpdateDryRunEndToEnd:
    """端到端：run_data_update --dry-run --use-current-data 必须在真实仓库上 PASS。

    依赖真实生产数据有效（CI 中 test:data 先行通过），staging 与报告全部写入 tmp_path。
    """

    def test_dry_run_with_current_data_passes(self, tmp_path):
        result = subprocess.run(
            [
                sys.executable, "scripts/run_data_update.py",
                "--dry-run", "--use-current-data",
                "--staging-dir", str(tmp_path / "staging"),
                "--json-report", str(tmp_path / "diff.json"),
                "--md-report", str(tmp_path / "diff.md"),
            ],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=300,
        )
        assert result.returncode == 0, (
            f"dry-run 应 exit 0 (unchanged)，实际 {result.returncode}\n"
            f"stdout tail: {result.stdout[-2000:]}\nstderr tail: {result.stderr[-1000:]}"
        )
        for file_name in STAGING_DATA_FILES:
            assert (tmp_path / "staging" / file_name).exists(), f"staging 缺少 {file_name}"

    def test_dry_run_staging_survives_for_inspection(self, tmp_path):
        """dry-run 不清空 staging（保留供人工检查），且不触碰生产 data/latest。"""
        staging = tmp_path / "staging"
        subprocess.run(
            [
                sys.executable, "scripts/run_data_update.py",
                "--dry-run", "--use-current-data",
                "--staging-dir", str(staging),
                "--json-report", str(tmp_path / "diff.json"),
                "--md-report", str(tmp_path / "diff.md"),
            ],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=300,
        )
        assert staging.exists(), "dry-run 结束后 staging 应保留"
        manifest = json.loads((staging / "manifest.json").read_text(encoding="utf-8"))
        assert manifest.get("stats_scrape_date"), "staging manifest 应携带 stats_scrape_date"
