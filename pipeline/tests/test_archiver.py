"""archiver 单元测试：按月归档与幂等。"""
import json

import pytest

from pipeline.processors import archiver


@pytest.fixture
def latest_dir(tmp_path):
    d = tmp_path / "data" / "latest"
    d.mkdir(parents=True)
    (d / "manifest.json").write_text(
        json.dumps({"stats_scrape_date": "2026-05-08", "generated_at": "x"}), encoding="utf-8"
    )
    (d / "metro_stats.json").write_text("{}", encoding="utf-8")
    (d / "quality_report.json").write_text("{}", encoding="utf-8")
    return d


class TestArchive:
    def test_archive_by_scrape_month(self, latest_dir, tmp_path):
        result = archiver.archive_latest(str(latest_dir), root=str(tmp_path))
        assert result["archived"] is True
        assert result["month"] == "2026-05"
        dest = tmp_path / "data" / "history" / "2026-05"
        assert (dest / "manifest.json").exists()
        assert (dest / "metro_stats.json").exists()
        # city_assets_index.json 缺失时不炸，其余照归
        assert not (dest / "city_assets_index.json").exists()

    def test_idempotent_second_run_skips(self, latest_dir, tmp_path):
        first = archiver.archive_latest(str(latest_dir), root=str(tmp_path))
        assert first["archived"] is True
        second = archiver.archive_latest(str(latest_dir), root=str(tmp_path))
        assert second["archived"] is False
        assert second["month"] == "2026-05"

    def test_missing_scrape_date_skips(self, tmp_path):
        d = tmp_path / "data" / "latest"
        d.mkdir(parents=True)
        (d / "manifest.json").write_text(json.dumps({"stats_scrape_date": None}), encoding="utf-8")
        result = archiver.archive_latest(str(d), root=str(tmp_path))
        assert result["archived"] is False
        assert result["month"] is None

    def test_missing_manifest_dir_skips(self, tmp_path):
        result = archiver.archive_latest(str(tmp_path / "nope"), root=str(tmp_path))
        assert result == {"archived": False, "month": None, "dest": None}
