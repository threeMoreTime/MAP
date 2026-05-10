#!/usr/bin/env python3
"""
City cover image scraper for Wikimedia Commons / Wikidata.

Collects CC-licensed city skyline/landscape images, converts to webp (800px wide),
and saves to assets/city-covers/ with a manifest.json for attribution tracking.

Usage:
    python scrapers/scrape_city_covers.py [--limit N] [--city SLUG] [--force]
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' package not found. Install with: pip install requests")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("ERROR: 'Pillow' package not found. Install with: pip install Pillow")
    sys.exit(1)

try:
    from io import BytesIO
except ImportError:
    print("ERROR: 'io' module not available.")
    sys.exit(1)

import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

ROOT_DIR = Path(__file__).resolve().parent.parent
INDEX_PATH = ROOT_DIR / "data" / "latest" / "city_assets_index.json"
OUTPUT_DIR = ROOT_DIR / "assets" / "city-covers"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"

COMMONS_API = "https://commons.wikimedia.org/w/api.php"
WIKIDATA_API = "https://www.wikidata.org/w/api.php"

TARGET_WIDTH = 800
WEBP_QUALITY = 80
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB max per image before conversion

EXCLUDE_PATTERNS = re.compile(
    r'(logo|map(?!\s)*(?:\s|$|_)|metro\s*map|subway\s*map|route|diagram|'
    r'plan(?!ning|et)|icon|seal|flag|coat.of.arms|emblem|badge|sign)',
    re.IGNORECASE
)

ACCEPTABLE_LICENSES = {
    'cc0', 'public domain', 'cc by 2.0', 'cc by 2.5', 'cc by 3.0',
    'cc by 4.0', 'cc by-sa 2.0', 'cc by-sa 2.5', 'cc by-sa 3.0',
    'cc by-sa 4.0', 'cc-by-2.0', 'cc-by-2.5', 'cc-by-3.0', 'cc-by-4.0',
    'cc-by-sa-2.0', 'cc-by-sa-2.5', 'cc-by-sa-3.0', 'cc-by-sa-4.0',
    'cc by-sa 3.0 de', 'cc by-sa 4.0 de', 'cc by 3.0 de', 'cc by 4.0 de',
    'cc-by-sa-3.0,2.5,2.0,1.0', 'cc-by-sa-3.0-migrated',
    'cc-by-sa-4.0,3.0,2.5,2.0,1.0',
}

SESSION = requests.Session()
SESSION.headers.update({
    'User-Agent': 'MAP-CityCovers/1.0 (https://github.com/threeMoreTime/MAP; educational project)'
})


def strip_html(text):
    if not text:
        return ''
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'&[a-zA-Z]+;', ' ', text)
    return text.strip()


def is_acceptable_license(license_name):
    if not license_name:
        return False
    normalized = license_name.lower().strip()
    for lic in ACCEPTABLE_LICENSES:
        if lic in normalized or normalized in lic:
            return True
    return False


def is_excluded_filename(filename, title=''):
    combined = (filename + ' ' + title).lower()
    return bool(EXCLUDE_PATTERNS.search(combined))


def load_cities():
    with open(INDEX_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data['items']


def load_existing_manifest():
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


def commons_search(query, limit=10):
    params = {
        'action': 'query',
        'list': 'search',
        'srsearch': query,
        'srnamespace': 6,
        'srlimit': limit,
        'format': 'json',
    }
    try:
        resp = SESSION.get(COMMONS_API, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data.get('query', {}).get('search', [])
    except Exception as e:
        print(f"  [WARN] Commons search failed for '{query}': {e}")
        return []


def get_image_info(filename):
    params = {
        'action': 'query',
        'titles': f'File:{filename}',
        'prop': 'imageinfo',
        'iiprop': 'url|size|extmetadata',
        'format': 'json',
    }
    try:
        resp = SESSION.get(COMMONS_API, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        pages = data.get('query', {}).get('pages', {})
        for page_id, page in pages.items():
            if page_id == '-1':
                return None
            info_list = page.get('imageinfo', [])
            if not info_list:
                return None
            info = info_list[0]
            ext = info.get('extmetadata', {})

            license_name = strip_html(ext.get('LicenseShortName', {}).get('value', ''))
            artist = strip_html(ext.get('Artist', {}).get('value', ''))

            return {
                'url': info.get('url', ''),
                'width': info.get('width', 0),
                'height': info.get('height', 0),
                'license': license_name,
                'artist': artist,
                'attribution': strip_html(ext.get('Attribution', {}).get('value', '')),
                'description_url': info.get('descriptionurl', ''),
            }
    except Exception as e:
        print(f"  [WARN] Image info failed for '{filename}': {e}")
    return None


def wikidata_search_city(city_cn, city_en):
    qid = None
    for lang, name in [('zh', city_cn), ('en', city_en)]:
        params = {
            'action': 'wbsearchentities',
            'search': name,
            'language': lang,
            'format': 'json',
            'limit': 3,
            'type': 'item',
        }
        try:
            resp = SESSION.get(WIKIDATA_API, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            results = data.get('search', [])
            for r in results:
                if 'metro' in r.get('label', '').lower() or ' subway' in r.get('label', '').lower():
                    continue
                qid = r.get('id')
                break
            if qid:
                break
        except Exception:
            continue
    return qid


def wikidata_get_image(qid):
    params = {
        'action': 'wbgetentities',
        'ids': qid,
        'props': 'claims',
        'format': 'json',
    }
    try:
        resp = SESSION.get(WIKIDATA_API, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        entity = data.get('entities', {}).get(qid, {})
        claims = entity.get('claims', {})
        p18 = claims.get('P18', [])
        if p18:
            mainsnak = p18[0].get('mainsnak', {})
            filename = mainsnak.get('datavalue', {}).get('value', '')
            if filename:
                return filename
    except Exception as e:
        print(f"  [WARN] Wikidata image lookup failed for {qid}: {e}")
    return None


def find_best_image(city_cn, city_en):
    city_slug = city_en if city_en else city_cn

    search_queries = [
        f'{city_cn} 天际线',
        f'{city_cn} skyline',
        f'{city_cn} 城市风光',
        f'{city_cn} cityscape',
        f'{city_slug} skyline',
        f'{city_cn} 夜景 城市',
        f'{city_slug} cityscape night',
        f'{city_cn} 地标 建筑',
    ]

    candidates = []
    seen_files = set()

    for query in search_queries:
        results = commons_search(query, limit=8)
        for r in results:
            filename = r.get('title', '').replace('File:', '')
            if not filename or filename in seen_files:
                continue
            seen_files.add(filename)

            if is_excluded_filename(filename, r.get('snippet', '')):
                continue

            ext_lower = filename.lower()
            if not (ext_lower.endswith('.jpg') or ext_lower.endswith('.jpeg')
                    or ext_lower.endswith('.png') or ext_lower.endswith('.webp')):
                continue

            info = get_image_info(filename)
            if not info or not info['url']:
                continue

            if info['width'] < 800:
                continue

            if info['width'] > 0 and info['height'] > 0:
                ratio = info['width'] / info['height']
                if ratio < 1.0:
                    continue
                if ratio > 5.0:
                    continue

            if not info['license'] or not info['artist']:
                continue

            if not is_acceptable_license(info['license']):
                continue

            score = 0
            snippet = r.get('snippet', '').lower()
            title_lower = filename.lower()

            if 'skyline' in title_lower or 'skyline' in snippet:
                score += 10
            if 'cityscape' in title_lower or 'cityscape' in snippet:
                score += 8
            if 'panorama' in title_lower or 'panorama' in snippet:
                score += 7
            if 'night' in title_lower or 'night' in snippet:
                score += 3
            if 'aerial' in title_lower or 'aerial' in snippet:
                score += 2

            if info['width'] >= 2000:
                score += 3
            elif info['width'] >= 1200:
                score += 2
            elif info['width'] >= 800:
                score += 1

            ratio = info['width'] / max(info['height'], 1)
            if 1.5 <= ratio <= 2.5:
                score += 3
            elif 1.2 <= ratio <= 3.0:
                score += 1

            score += min(len(info['artist']), 20)

            candidates.append({
                'filename': filename,
                'score': score,
                'info': info,
            })

        time.sleep(0.3)

    candidates.sort(key=lambda x: x['score'], reverse=True)

    if candidates:
        best = candidates[0]
        return best['filename'], best['info']

    qid = wikidata_search_city(city_cn, city_slug)
    if qid:
        wd_filename = wikidata_get_image(qid)
        if wd_filename and not is_excluded_filename(wd_filename):
            info = get_image_info(wd_filename)
            if info and info['url'] and info['width'] >= 800 and info['license'] and info['artist']:
                if is_acceptable_license(info['license']):
                    return wd_filename, info

    return None, None


def download_and_convert(url, output_path):
    try:
        resp = SESSION.get(url, timeout=30, stream=True)
        resp.raise_for_status()

        content_length = int(resp.headers.get('content-length', 0))
        if content_length > MAX_FILE_SIZE:
            print(f"  [SKIP] Image too large ({content_length // 1024}KB)")
            return None, None

        img_data = BytesIO(resp.content)
        img = Image.open(img_data)

        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGBA')
            background = Image.new('RGBA', img.size, (0, 0, 0, 255))
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background.convert('RGB')
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        orig_w, orig_h = img.size
        if orig_w > TARGET_WIDTH:
            new_h = int(orig_h * TARGET_WIDTH / orig_w)
            img = img.resize((TARGET_WIDTH, new_h), Image.LANCZOS)

        final_w, final_h = img.size
        img.save(output_path, 'WEBP', quality=WEBP_QUALITY, method=6)

        file_size = os.path.getsize(output_path)
        return final_w, final_h

    except Exception as e:
        print(f"  [ERROR] Download/convert failed: {e}")
        if output_path.exists():
            output_path.unlink()
        return None, None


def process_city(city_item, force=False):
    city = city_item['city']
    city_cn = city_item['city_cn']
    city_en = city

    output_file = OUTPUT_DIR / f"{city}.webp"

    if not force and output_file.exists():
        print(f"  [SKIP] {city_cn} ({city}) - already exists")
        return None

    print(f"  [{city_cn}] Searching for cover image...")

    filename, info = find_best_image(city_cn, city_en)

    if not filename or not info:
        print(f"  [FALLBACK] {city_cn} - no suitable licensed image found")
        return {
            'city': city,
            'city_cn': city_cn,
            'file': None,
            'status': 'fallback',
            'reason': 'no suitable licensed image found',
        }

    print(f"  [DOWNLOAD] {city_cn} <- {filename}")
    w, h = download_and_convert(info['url'], output_file)

    if w is None:
        return {
            'city': city,
            'city_cn': city_cn,
            'file': None,
            'status': 'error',
            'reason': 'download or conversion failed',
        }

    file_size = os.path.getsize(output_file)
    print(f"  [OK] {city_cn} saved: {w}x{h}, {file_size // 1024}KB")

    attribution = info.get('attribution', '') or info.get('artist', '')

    return {
        'city': city,
        'city_cn': city_cn,
        'file': f"{city}.webp",
        'status': 'downloaded',
        'source_url': info.get('description_url', ''),
        'image_url': info.get('url', ''),
        'license': info.get('license', ''),
        'author': info.get('artist', ''),
        'attribution': attribution,
        'width': w,
        'height': h,
    }


def main():
    parser = argparse.ArgumentParser(description='Scrape city cover images from Wikimedia Commons')
    parser.add_argument('--limit', type=int, default=0, help='Only process first N cities')
    parser.add_argument('--city', type=str, default='', help='Only process specific city slug')
    parser.add_argument('--force', action='store_true', help='Re-download even if webp exists')
    args = parser.parse_args()

    if not INDEX_PATH.exists():
        print(f"ERROR: City index not found at {INDEX_PATH}")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    cities = load_cities()
    print(f"Loaded {len(cities)} cities from index")

    if args.city:
        cities = [c for c in cities if c['city'] == args.city]
        if not cities:
            print(f"ERROR: City '{args.city}' not found in index")
            sys.exit(1)
        print(f"Processing single city: {cities[0]['city_cn']}")

    if args.limit > 0:
        cities = cities[:args.limit]
        print(f"Limited to first {args.limit} cities")

    existing_manifest = load_existing_manifest()
    existing_map = {}
    if existing_manifest:
        for item in existing_manifest.get('items', []):
            existing_map[item['city']] = item

    manifest_items = []
    downloaded = 0
    fallback = 0
    errors = 0
    skipped = 0

    for i, city_item in enumerate(cities):
        city = city_item['city']
        city_cn = city_item['city_cn']

        output_file = OUTPUT_DIR / f"{city}.webp"

        if not args.force and output_file.exists() and city in existing_map:
            manifest_items.append(existing_map[city])
            skipped += 1
            print(f"  [{i+1}/{len(cities)}] {city_cn} - cached")
            continue

        print(f"\n[{i+1}/{len(cities)}] Processing {city_cn} ({city})...")
        result = process_city(city_item, force=args.force)

        if result is None:
            if city in existing_map:
                manifest_items.append(existing_map[city])
                skipped += 1
            elif output_file.exists():
                try:
                    img = Image.open(output_file)
                    w, h = img.size
                    img.close()
                    manifest_items.append({
                        'city': city, 'city_cn': city_cn,
                        'file': f"{city}.webp", 'status': 'downloaded',
                        'source_url': '', 'image_url': '',
                        'license': 'unknown', 'author': '',
                        'attribution': '', 'width': w, 'height': h,
                    })
                    skipped += 1
                    print(f"  [{i+1}/{len(cities)}] {city_cn} - recovered from existing webp")
                except Exception:
                    skipped += 1
            continue

        manifest_items.append(result)

        if result['status'] == 'downloaded':
            downloaded += 1
        elif result['status'] == 'fallback':
            fallback += 1
        elif result['status'] == 'error':
            errors += 1

        time.sleep(0.5)

    for city in existing_map:
        if city not in {item['city'] for item in manifest_items}:
            manifest_items.append(existing_map[city])

    manifest = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'source': 'wikimedia-commons',
        'items': manifest_items,
    }

    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"Complete!")
    print(f"  Downloaded: {downloaded}")
    print(f"  Fallback:   {fallback}")
    print(f"  Errors:     {errors}")
    print(f"  Skipped:    {skipped}")
    print(f"  Total items in manifest: {len(manifest_items)}")
    print(f"  Manifest: {MANIFEST_PATH}")

    if OUTPUT_DIR.exists():
        total_size = sum(f.stat().st_size for f in OUTPUT_DIR.iterdir() if f.is_file() and f.suffix == '.webp')
        webp_count = sum(1 for f in OUTPUT_DIR.iterdir() if f.is_file() and f.suffix == '.webp')
        print(f"  Total webp files: {webp_count}")
        print(f"  Total size: {total_size / 1024:.1f} KB ({total_size / (1024*1024):.2f} MB)")


if __name__ == '__main__':
    main()
