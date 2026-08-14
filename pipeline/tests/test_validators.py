"""validators 单元测试：结构校验、数量一致性、路径存在性。"""
import json
import os

import pytest

from pipeline.models import ValidationResult
from pipeline.validators import schema_validator


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


@pytest.fixture
def valid_city():
    return {
        "city": "xiamen",
        "city_cn": "厦门",
        "scrape_date": "2026-01-01",
        "operating_lines": 3,
        "operating_stations": 98,
        "operating_mileage_km": 98.4,
        "daily_ridership_wan": 60.5,
        "ridership_intensity": 0.61,
        "peak_ridership_wan": 80.2,
        "peak_ridership_date": "2024-05-01",
        "yearly_avg_ridership": {"years": [2023, 2024], "values": [50.0, 55.0]},
    }


class TestMetroStats:
    def test_valid_item_passes(self, valid_city):
        result = ValidationResult()
        schema_validator.validate_metro_stats(
            {"items": [valid_city]}, result
        )
        assert result.ok

    def test_missing_required_field(self, valid_city):
        del valid_city["scrape_date"]
        result = ValidationResult()
        schema_validator.validate_metro_stats({"items": [valid_city]}, result)
        assert any("scrape_date" in e for e in result.errors)

    def test_yearly_length_mismatch(self, valid_city):
        valid_city["yearly_avg_ridership"]["values"] = [50.0]
        result = ValidationResult()
        schema_validator.validate_metro_stats({"items": [valid_city]}, result)
        assert any("长度不一致" in e for e in result.errors)

    def test_zero_daily_is_warning_not_error(self, valid_city):
        valid_city["daily_ridership_wan"] = 0
        result = ValidationResult()
        schema_validator.validate_metro_stats({"items": [valid_city]}, result)
        assert result.ok
        assert len(result.warnings) == 1

    def test_missing_items_field(self):
        result = ValidationResult()
        schema_validator.validate_metro_stats({"city_count": 0}, result)
        assert any("items" in e for e in result.errors)


class TestCityAssetsIndex:
    def test_missing_path_file_reports_error(self, tmp_path):
        result = ValidationResult()
        schema_validator.validate_city_assets_index(
            {
                "items": [
                    {
                        "city": "nowhere",
                        "network_map_path": "cities/nowhere/nowhere_network.png",
                    }
                ]
            },
            result,
            root=str(tmp_path),
        )
        assert any("资源路径不存在" in e for e in result.errors)

    def test_existing_path_passes(self, tmp_path):
        img = tmp_path / "cities" / "xiamen" / "xiamen_network.webp"
        img.parent.mkdir(parents=True)
        img.write_bytes(b"fake")
        result = ValidationResult()
        schema_validator.validate_city_assets_index(
            {"items": [{"city": "xiamen", "network_map_path": "cities/xiamen/xiamen_network.webp"}]},
            result,
            root=str(tmp_path),
        )
        assert result.ok


class TestManifest:
    def test_count_mismatch(self):
        result = ValidationResult()
        schema_validator.validate_manifest(
            {"stats_city_count": 34, "asset_city_count": 50, "data_files": []},
            {"items": [1, 2, 3]},
            {"items": [1]},
            data_dir="/tmp/x",
            result=result,
            root="/",
        )
        assert len(result.errors) == 2

    def test_data_file_mapping_to_custom_dir(self, tmp_path):
        target = tmp_path / "staging" / "metro_stats.json"
        target.parent.mkdir(parents=True)
        target.write_text("{}")
        resolved = schema_validator.resolve_manifest_data_file_path(
            "data/latest/metro_stats.json", str(tmp_path / "staging"), root=str(tmp_path)
        )
        assert os.path.abspath(resolved) == os.path.abspath(str(target))


class TestQualityReport:
    def test_score_out_of_range(self):
        result = ValidationResult()
        schema_validator.validate_quality_report(
            {"summary": {"city_count": 1}, "cities": [{"city": "a", "quality_score": 150, "quality_level": "high"}],
             "missing_groups": {}},
            {"items": [{"city": "a"}]},
            result,
        )
        assert any("quality_score" in e for e in result.errors)

    def test_unregistered_city(self):
        result = ValidationResult()
        schema_validator.validate_quality_report(
            {"summary": {"city_count": 1}, "cities": [{"city": "ghost", "quality_score": 50, "quality_level": "low"}],
             "missing_groups": {}},
            {"items": [{"city": "a"}]},
            result,
        )
        assert any("未注册" in e for e in result.errors)


class TestRun:
    def test_missing_dir_fails_cleanly(self, tmp_path):
        result = schema_validator.run(str(tmp_path / "nope"), root=str(tmp_path))
        assert not result.ok
        assert any("数据目录不存在" in e for e in result.errors)
