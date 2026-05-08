"""
MetroDB 城市客流数据爬取脚本
数据源: https://metrodb.org/index/{city}.html
输出: 各城市文件夹下 {city}_stats.json
"""
import json
import os
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

BASE_URL = "https://metrodb.org/index"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
CITIES_DIR = os.path.join(ROOT, "cities")
LOG_FILE = os.path.join(SCRIPT_DIR, "scrape_metrodb_log.txt")
MAX_WORKERS = 8

# 明确无数据的城市（metrodb 标注"缺数据"或返回占位数据）
NO_DATA_CITIES = {
    "fuzhou", "ningbo", "wenzhou", "jinan", "luoyang", "xuzhou",
    "urumqi", "hongkong", "macau", "taipei", "kaohsiung", "taoyuan",
    "taichung", "jinhua", "taizhou", "macao",
}

CITY_CN = {
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

log_lines = []

def log(level, msg):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] [{level}] {msg}"
    print(line)
    log_lines.append(line)


def fetch_html(city):
    url = f"{BASE_URL}/{city}.html"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_rollnum(html, key):
    pattern = rf'rollNum\("{key}",\s*\d+,\s*([0-9.]+)'
    m = re.search(pattern, html)
    return m.group(1) if m else None


def extract_rollnum_date(html, key):
    pattern = rf'rollNum\("{key}",\s*\d+,\s*(\d{{4}}-\d{{2}}-\d{{2}})'
    m = re.search(pattern, html)
    return m.group(1) if m else None


def extract_yearly_data(html):
    # 找到 yearflowChart 部分中的数据
    # 模式: 在 yearflow 相关代码段中找到 data: [years] 和 data: [values]
    section = html[html.find("yearflowChart"):] if "yearflowChart" in html else ""

    # 匹配 data: [数字数组] 格式
    data_arrays = re.findall(r'data:\s*\[([0-9.,\s]+)\]', section)

    years = []
    values = []
    if len(data_arrays) >= 2:
        years = [float(x.strip()) for x in data_arrays[0].split(",") if x.strip()]
        values = [float(x.strip()) for x in data_arrays[1].split(",") if x.strip()]
    elif len(data_arrays) == 1:
        # 可能只有年份或只有值
        vals = [float(x.strip()) for x in data_arrays[0].split(",") if x.strip()]
        if any(v > 2000 for v in vals):
            years = vals
        else:
            values = vals

    return years, values


def scrape_city(city):
    city_cn = CITY_CN.get(city, city)
    city_dir = os.path.join(CITIES_DIR, city)

    if not os.path.isdir(city_dir):
        return

    if city in NO_DATA_CITIES:
        log("SKIP", f"{city} ({city_cn}) 无客流数据(已知缺数据城市)")
        return

    try:
        html = fetch_html(city)
    except Exception as e:
        log("FAIL", f"{city} ({city_cn}) 请求失败: {e}")
        return

    if "rollNum" not in html:
        log("SKIP", f"{city} ({city_cn}) 无客流数据")
        return

    data = {
        "city": city,
        "city_cn": city_cn,
        "scrape_date": datetime.now().strftime("%Y-%m-%d"),
        "operating_lines": int(extract_rollnum(html, "line_open") or 0),
        "lines_under_construction": int(extract_rollnum(html, "line_build") or 0),
        "operating_stations": int(extract_rollnum(html, "open_site") or 0),
        "operating_mileage_km": float(extract_rollnum(html, "total_milage") or 0),
        "daily_ridership_wan": float(extract_rollnum(html, "flow_last") or 0),
        "ridership_intensity": float(extract_rollnum(html, "flow_ratio") or 0),
        "peak_ridership_wan": float(extract_rollnum(html, "flow_top") or 0),
        "peak_ridership_date": extract_rollnum_date(html, "flow_top_date") or "unknown",
    }

    years, values = extract_yearly_data(html)
    data["yearly_avg_ridership"] = {
        "years": [int(y) for y in years],
        "values": values,
    }

    json_path = os.path.join(city_dir, f"{city}_stats.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    log("  OK", f"{city} ({city_cn}) 日客流 {data['daily_ridership_wan']}万, "
               f"里程 {data['operating_mileage_km']}km, "
               f"站点 {data['operating_stations']}座")


def main():
    print("=" * 44)
    print(" MetroDB 客流数据爬取工具 (Python)")
    print(f" 并发: {MAX_WORKERS}")
    print(f" 输出: cities/{{city}}/{{city}}_stats.json")
    print("=" * 44)
    print()

    # 获取已有城市文件夹
    cities = sorted([
        d for d in os.listdir(CITIES_DIR)
        if os.path.isdir(os.path.join(CITIES_DIR, d))
        and not d.startswith(".")
    ])
    print(f"发现 {len(cities)} 个城市文件夹\n")

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(scrape_city, c): c for c in cities}
        for f in as_completed(futures):
            try:
                f.result()
            except Exception as e:
                log("FAIL", f"{futures[f]} 异常: {e}")

    # 统计
    json_count = sum(
        1 for root, _, files in os.walk(CITIES_DIR)
        for f in files if f.endswith("_stats.json")
    )

    # 写日志
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write(f"========== MetroDB 爬取日志 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ==========\n")
        f.write("\n".join(log_lines))

    print()
    print("=" * 44)
    print(f" 完成: 生成 {json_count} 个 JSON 文件")
    print(f" 日志: {LOG_FILE}")
    print("=" * 44)


if __name__ == "__main__":
    main()
