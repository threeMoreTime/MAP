"""
scrape_subway_route_map.py
从 metroman.cn 批量下载全国城市地铁运营线路图和规划线路图

数据源: https://www.metroman.cn
URL 模式: https://www.metroman.cn/assets/img/metro/{map|plan}/routemap_{code}_cn.png
输出:   cities/{city}/{city}_network.png (运营线路图)
        cities/{city}/{city}_plan.png    (规划线路图)

用法:   python scrape_subway_route_map.py
"""

import os
import ssl
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# ============================================================
# 配置
# ============================================================

BASE_URL = "https://www.metroman.cn/assets/img/metro"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CITIES_DIR = os.path.join(SCRIPT_DIR, "cities")
LOG_FILE = os.path.join(SCRIPT_DIR, "scrapers", "scrape_log.txt")
MAX_WORKERS = 8
TIMEOUT = 30
MIN_FILE_SIZE = 2048  # 小于此值视为占位图，跳过

# SSL context（该站点 SSL 配置不标准，需禁用验证）
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

# 城市列表（拼音代码）
CITIES = [
    "beijing", "shanghai", "guangzhou", "shenzhen",
    "chengdu", "wuhan", "chongqing", "xian",
    "hangzhou", "nanjing", "tianjin", "zhengzhou",
    "changsha", "shenyang", "suzhou", "nanning",
    "changchun", "taiyuan", "qingdao", "dalian",
    "hohhot", "changzhou", "kunming", "dongguan",
    "guiyang", "nanchang", "hefei", "harbin",
    "shijiazhuang", "xiamen", "lanzhou", "wuxi",
    "wuhu", "foshan", "shaoxing", "nantong",
    "fuzhou", "ningbo", "wenzhou", "jinan",
    "luoyang", "xuzhou", "urumqi", "hongkong",
    "macau", "kaohsiung", "taichung", "taipei",
    "jinhua", "taizhou",
]

# 城市 code -> 中文名
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
    "jinhua": "金华", "taizhou": "台州",
}

# metroman URL 中城市 code 使用缩写（拼音首字母）
CITY_CODE_MAP = {
    "beijing": "bj", "shanghai": "sh", "guangzhou": "gz", "shenzhen": "sz",
    "chengdu": "cd", "wuhan": "wh", "chongqing": "cq", "xian": "xa",
    "hangzhou": "hz", "nanjing": "nj", "tianjin": "tj", "zhengzhou": "zz",
    "changsha": "cs", "shenyang": "sy", "suzhou": "su", "nanning": "nn",
    "changchun": "cc", "taiyuan": "ty", "qingdao": "qd", "dalian": "dl",
    "hohhot": "hh", "changzhou": "cz", "kunming": "km", "dongguan": "dg",
    "guiyang": "gy", "nanchang": "nc", "hefei": "hf", "harbin": "hb",
    "shijiazhuang": "sj", "xiamen": "xm", "lanzhou": "lz", "wuxi": "wx",
    "wuhu": "wu", "foshan": "fs", "shaoxing": "sx", "nantong": "nt",
    "fuzhou": "fz", "ningbo": "nb", "wenzhou": "wz", "jinan": "jn",
    "luoyang": "ly", "xuzhou": "xz", "urumqi": "wl", "hongkong": "hk",
    "macau": "mc", "kaohsiung": "kx", "taichung": "tc", "taipei": "tb",
    "jinhua": "jh", "taizhou": "tz",
}

# ============================================================
# 日志
# ============================================================

log_lines = []


def log(level, msg):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] [{level}] {msg}"
    print(line)
    log_lines.append(line)


# ============================================================
# 下载逻辑
# ============================================================

def download_image(city, img_type):
    """下载单张图片

    Args:
        city: 城市拼音代码，如 "beijing"
        img_type: "map" (运营线路图) 或 "plan" (规划图)

    Returns:
        (city, img_type, success: bool, size: int)
    """
    code = CITY_CODE_MAP.get(city, city)
    url = f"{BASE_URL}/{img_type}/routemap_{code}_cn.png"
    city_cn = CITY_CN.get(city, city)

    # 城市目录
    city_dir = os.path.join(CITIES_DIR, city)
    os.makedirs(city_dir, exist_ok=True)

    # 目标文件名
    suffix = "network" if img_type == "map" else "plan"
    filepath = os.path.join(city_dir, f"{city}_{suffix}.png")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=SSL_CTX) as resp:
            data = resp.read()

        size = len(data)

        if size < MIN_FILE_SIZE:
            log("SKIP", f"[{city}] {city_cn} {suffix} ({size} bytes, 占位图)")
            return (city, img_type, False, size)

        with open(filepath, "wb") as f:
            f.write(data)

        size_kb = size / 1024
        log("  OK", f"[{city}] {city_cn} {suffix} ({size_kb:.0f} KB)")
        return (city, img_type, True, size)

    except urllib.error.HTTPError as e:
        log("FAIL", f"[{city}] {city_cn} {suffix} HTTP {e.code}")
        return (city, img_type, False, 0)
    except Exception as e:
        log("FAIL", f"[{city}] {city_cn} {suffix} {e}")
        return (city, img_type, False, 0)


# ============================================================
# 主流程
# ============================================================

def main():
    start_time = time.time()

    print("=" * 50)
    print(" MetroMan 城市线路图批量下载工具")
    print(f" 城市: {len(CITIES)} 个")
    print(f" 并发: {MAX_WORKERS}")
    print(f" 输出: {CITIES_DIR}")
    print(f" 占位图阈值: {MIN_FILE_SIZE} bytes")
    print("=" * 50)
    print()

    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

    network_ok = 0
    network_skip = 0
    plan_ok = 0
    plan_skip = 0
    fail_list = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = []
        for city in CITIES:
            futures.append(pool.submit(download_image, city, "map"))
            futures.append(pool.submit(download_image, city, "plan"))

        for f in as_completed(futures):
            try:
                city, img_type, success, size = f.result()
                if img_type == "map":
                    if success:
                        network_ok += 1
                    else:
                        network_skip += 1
                        fail_list.append((city, "network", size))
                else:
                    if success:
                        plan_ok += 1
                    else:
                        plan_skip += 1
                        fail_list.append((city, "plan", size))
            except Exception as e:
                log("ERROR", str(e))

    elapsed = time.time() - start_time

    # 写日志文件
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write(f"========== MetroMan 爬取日志 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ==========\n")
        f.write(f"输出目录: {CITIES_DIR}\n")
        f.write(f"并发数: {MAX_WORKERS}\n\n")
        f.write("\n".join(log_lines))
        f.write(f"\n\n统计: 线路图 {network_ok}/{len(CITIES)}, 规划图 {plan_ok}/{len(CITIES)}, 耗时 {elapsed:.0f}s\n")

    print()
    print("=" * 50)
    print(f" 完成: 线路图 {network_ok}/{len(CITIES)}, 规划图 {plan_ok}/{len(CITIES)}")
    print(f" 跳过/失败: 线路图 {network_skip}, 规划图 {plan_skip}")
    print(f" 耗时: {elapsed:.0f}s")
    print(f" 日志: {LOG_FILE}")
    print("=" * 50)

    if fail_list:
        print()
        print("未下载列表:")
        for city, suffix, size in fail_list:
            cn = CITY_CN.get(city, city)
            reason = "占位图" if size > 0 else "下载失败"
            print(f"  {cn} ({city}) {suffix}: {reason}")


if __name__ == "__main__":
    main()
