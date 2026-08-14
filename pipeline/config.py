"""管线共享配置与工具函数。"""
import json
import os
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CITIES_DIR = os.path.join(ROOT, "cities")
DATA_LATEST_DIR = os.path.join(ROOT, "data", "latest")
DATA_SCHEMA_DIR = os.path.join(ROOT, "data", "schema")
COVERS_MANIFEST_PATH = os.path.join(ROOT, "assets", "city-covers", "manifest.json")

# 目录名 → 中文名（与 scrape_metrodb.py 保持一致）
CITY_CN_MAP = {
    "beijing": "北京", "shanghai": "上海", "guangzhou": "广州", "shenzhen": "深圳",
    "chengdu": "成都", "wuhan": "武汉", "chongqing": "重庆", "xian": "西安",
    "hangzhou": "杭州", "nanjing": "南京", "tianjin": "天津", "zhengzhou": "郑州",
    "changsha": "长沙", "shenyang": "沈阳", "suzhou": "苏州", "nanning": "南宁",
    "changchun": "长春", "taiyuan": "太原", "qingdao": "青岛", "dalian": "大连",
    "hohhot": "呼和浩特", "changzhou": "常州", "kunming": "昆明", "dongguan": "东莞",
    "guiyang": "贵阳", "nanchang": "南昌", "hefei": "合肥", "harbin": "哈尔滨",
    "shijiazhuang": "石家庄", "xiamen": "厦门", "lanzhou": "兰州", "wuxi": "无锡",
    "wuhu": "芜湖", "foshan": "佛山", "shaoxing": "绍兴", "nantong": "南通",
    "fuzhou": "福州", "ningbo": "宁波", "wenzhou": "温州", "jinan": "济南",
    "luoyang": "洛阳", "xuzhou": "徐州", "urumqi": "乌鲁木齐", "hongkong": "香港",
    "macau": "澳门", "kaohsiung": "高雄", "taichung": "台中", "taipei": "台北",
    "jinhua": "金华", "taizhou": "台州", "taoyuan": "桃园",
}


def iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def serialize(data) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


def strip_generated_at(obj):
    if isinstance(obj, dict):
        return {k: v for k, v in obj.items() if k != "generated_at"}
    return obj


def write_json_if_changed(path: str, data) -> bool:
    """防噪写入：除 generated_at 外内容一致则跳过。返回是否实际写入。"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    new_text = serialize(data)
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


def get_city_cn(city_dir_name: str, stats_data=None) -> str:
    if stats_data and "city_cn" in stats_data:
        return stats_data["city_cn"]
    return CITY_CN_MAP.get(city_dir_name, city_dir_name)
