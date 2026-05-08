"""
scrape_all_cities.py
从 metroman.cn 批量下载城市地铁线路图和规划图
并发: 8 线程
输出: cities/{city}/{city}_network.png, cities/{city}/{city}_plan.png
"""
import os
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "https://metroman.cn/assets/img/metro"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
CITIES_DIR = os.path.join(ROOT_DIR, "cities")

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
]

MIN_FILE_SIZE = 2048

results = {"ok": [], "skip": [], "fail": []}


def download_image(city, img_type):
    code = city
    url = f"{BASE_URL}/{img_type}/routemap_{code}_cn.png"

    city_dir = os.path.join(CITIES_DIR, city)
    os.makedirs(city_dir, exist_ok=True)

    suffix = "network" if img_type == "map" else "plan"
    filepath = os.path.join(city_dir, f"{city}_{suffix}.png")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()

        if len(data) < MIN_FILE_SIZE:
            print(f"  SKIP [{city}] {suffix} ({len(data)} bytes)")
            results["skip"].append((city, suffix, len(data)))
            return

        with open(filepath, "wb") as f:
            f.write(data)

        size_kb = len(data) / 1024
        print(f"  OK   [{city}] {suffix} ({size_kb:.0f} KB)")
        results["ok"].append((city, suffix, len(data)))

    except Exception as e:
        print(f"  FAIL [{city}] {suffix}: {e}")
        results["fail"].append((city, suffix, str(e)))


def main():
    print("=" * 55)
    print(" MetroMan 城市地铁线路图批量下载")
    print(f" 城市数: {len(CITIES)}")
    print(f" 并发:   8")
    print(f" 输出:   {CITIES_DIR}")
    print("=" * 55)
    print()

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = []
        for city in CITIES:
            futures.append(pool.submit(download_image, city, "map"))
            futures.append(pool.submit(download_image, city, "plan"))
        for f in as_completed(futures):
            try:
                f.result()
            except Exception as e:
                print(f"  ERROR: {e}")

    network_count = sum(1 for c in CITIES
                        if os.path.exists(os.path.join(CITIES_DIR, c, f"{c}_network.png")))
    plan_count = sum(1 for c in CITIES
                     if os.path.exists(os.path.join(CITIES_DIR, c, f"{c}_plan.png")))

    print()
    print("=" * 55)
    print(f" 线路图: {network_count}/{len(CITIES)}")
    print(f" 规划图: {plan_count}/{len(CITIES)}")
    print(f" OK: {len(results['ok'])}  SKIP: {len(results['skip'])}  FAIL: {len(results['fail'])}")
    print("=" * 55)

    if results["fail"]:
        print()
        print("失败列表:")
        for city, suffix, err in results["fail"]:
            print(f"  {city}_{suffix}.png: {err}")


if __name__ == "__main__":
    main()
