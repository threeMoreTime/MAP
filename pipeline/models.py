"""管线数据模型（校验结果与城市资源记录）。"""
from dataclasses import dataclass, field


@dataclass
class ValidationIssue:
    level: str  # "error" | "warning"
    message: str


@dataclass
class ValidationResult:
    errors: list = field(default_factory=list)
    warnings: list = field(default_factory=list)

    def error(self, msg: str) -> None:
        self.errors.append(msg)

    def warning(self, msg: str) -> None:
        self.warnings.append(msg)

    @property
    def ok(self) -> bool:
        return not self.errors


@dataclass
class CityAssetRecord:
    """cities/<city>/ 目录下单个城市的资源清单。"""

    city: str
    city_cn: str
    has_stats: bool = False
    has_network_map: bool = False
    has_plan_map: bool = False
    has_yearly_trend: bool = False
    network_map_path: str | None = None
    plan_map_path: str | None = None
    stats_path: str | None = None
    yearly_trend_path: str | None = None

    def to_index_item(self) -> dict:
        return {
            "city": self.city,
            "city_cn": self.city_cn,
            "dir": self.city,
            "has_network_map": self.has_network_map,
            "network_map_path": self.network_map_path,
            "has_plan_map": self.has_plan_map,
            "plan_map_path": self.plan_map_path,
            "has_stats": self.has_stats,
            "stats_path": self.stats_path,
            "has_yearly_trend": self.has_yearly_trend,
            "yearly_trend_path": self.yearly_trend_path,
        }
