"""processors 单元测试：索引构建、质量审计评分、图片优化。"""
import json
import os

import pytest
from PIL import Image

from pipeline.processors import image_optimizer, index_builder, quality_auditor


def make_stats(city: str, city_cn: str, daily: float = 60.0, yearly=True) -> dict:
    return {
        "city": city,
        "city_cn": city_cn,
        "scrape_date": "2026-01-01",
        "operating_lines": 3,
        "lines_under_construction": 1,
        "operating_stations": 50,
        "operating_mileage_km": 100.0,
        "daily_ridership_wan": daily,
        "ridership_intensity": 0.6,
        "peak_ridership_wan": 80.0,
        "peak_ridership_date": "2024-05-01",
        "yearly_avg_ridership": {"years": [2023, 2024], "values": [50.0, 55.0]} if yearly else {"years": [], "values": []},
    }


@pytest.fixture
def fake_repo(tmp_path):
    """构造最小 cities/ 结构：两个城市，一个全量、一个无统计。"""
    cities = tmp_path / "cities"
    for city, cn, daily in [("xiamen", "厦门", 60.0), ("wuhu", "芜湖", 0.0)]:
        d = cities / city
        d.mkdir(parents=True)
        (d / f"{city}_stats.json").write_text(
            json.dumps(make_stats(city, cn, daily), ensure_ascii=False), encoding="utf-8"
        )
        Image.new("RGB", (40, 30), (200, 60, 40)).save(d / f"{city}_network.png")
    # 仅 xiamen 有规划图（webp 场景）
    Image.new("RGB", (40, 30), (40, 60, 200)).save(cities / "xiamen" / "xiamen_plan.png")
    return tmp_path


class TestIndexBuilder:
    def test_build_all_produces_consistent_outputs(self, fake_repo):
        summary = index_builder.build_all(root=str(fake_repo))
        assert summary["city_dirs"] == 2
        assert summary["stats_cities"] == 2
        assert summary["network_maps"] == 2
        assert summary["plan_maps"] == 1
        assert summary["no_daily"] == ["wuhu"]

        data = fake_repo / "data" / "latest"
        stats = json.loads((data / "metro_stats.json").read_text(encoding="utf-8"))
        assets = json.loads((data / "city_assets_index.json").read_text(encoding="utf-8"))
        manifest = json.loads((data / "manifest.json").read_text(encoding="utf-8"))

        assert stats["city_count"] == 2
        assert stats["no_daily_data_cities"] == ["wuhu"]
        assert manifest["stats_city_count"] == 2
        assert manifest["asset_city_count"] == 2
        assert manifest["plan_map_count"] == 1

        items = {i["city"]: i for i in assets["items"]}
        assert items["xiamen"]["city_cn"] == "厦门"
        assert items["xiamen"]["has_plan_map"] is True
        assert items["wuhu"]["has_plan_map"] is False
        assert items["wuhu"]["plan_map_path"] is None

    def test_webp_preferred_over_png(self, fake_repo):
        # 为 wuhu 增加 webp 版规划图，索引应优先指向 webp
        d = fake_repo / "cities" / "wuhu"
        Image.new("RGB", (40, 30), (10, 10, 10)).save(d / "wuhu_plan.webp")
        index_builder.build_all(root=str(fake_repo))
        assets = json.loads(
            (fake_repo / "data" / "latest" / "city_assets_index.json").read_text(encoding="utf-8")
        )
        items = {i["city"]: i for i in assets["items"]}
        assert items["wuhu"]["plan_map_path"].endswith(".webp")


class TestQualityAuditor:
    def test_scoring_and_levels(self, fake_repo):
        index_builder.build_all(root=str(fake_repo))
        data_dir = str(fake_repo / "data" / "latest")
        report = quality_auditor.build_report(data_dir, root=str(fake_repo), covers_path=str(fake_repo / "nope.json"))

        by_city = {c["city"]: c for c in report["cities"]}
        # xiamen: stats(20)+daily(20)+yearly(15)+network(15)+plan(15)+cover unknown(0)+operating(5) = 90
        assert by_city["xiamen"]["quality_score"] == 90
        assert by_city["xiamen"]["quality_level"] == "high"
        # wuhu: stats(20)+no daily(0)+no yearly data empty(0... yearly present? wuhu yearly=True in fixture)
        # wuhu: stats 20 + daily 0 + yearly 15 + network 15 + plan 0 + cover 0 + operating 5 = 55 → low
        assert by_city["wuhu"]["quality_score"] == 55
        assert by_city["wuhu"]["quality_level"] == "low"

        assert report["summary"]["city_count"] == 2
        assert report["summary"]["no_stats_count"] == 0
        assert report["missing_groups"]["no_plan_map"] == ["wuhu"]

    def test_missing_input_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            quality_auditor.build_report(str(tmp_path), root=str(tmp_path))


class TestImageOptimizer:
    def test_png_converted_and_original_removed(self, fake_repo):
        png = fake_repo / "cities" / "xiamen" / "xiamen_network.png"
        size_before = png.stat().st_size
        stats = image_optimizer.convert_dir_images(str(fake_repo / "cities"), quality=85)
        assert stats["converted"] >= 1
        assert not png.exists()
        webp = fake_repo / "cities" / "xiamen" / "xiamen_network.webp"
        assert webp.exists()
        assert stats["bytes_after"] <= stats["bytes_before"]
        assert size_before > 0

    def test_dry_run_keeps_originals(self, fake_repo):
        png = fake_repo / "cities" / "xiamen" / "xiamen_network.png"
        stats = image_optimizer.convert_dir_images(str(fake_repo / "cities"), dry_run=True)
        assert stats["converted"] >= 1
        assert png.exists()
