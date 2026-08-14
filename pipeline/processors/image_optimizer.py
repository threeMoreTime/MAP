"""图片优化处理器：cities/ 下 PNG 转 WebP，削减前端资源体积。

地铁线路图以细线与色块为主，quality=85 的 WebP 视觉无感且压缩率高。
转换成功后删除原 PNG（可由爬虫重新下载或 git 历史找回），
随后需重新执行 build-index 使索引指向 .webp 路径。
"""
import os

from PIL import Image


def convert_dir_images(cities_dir: str, quality: int = 85,
                       dry_run: bool = False) -> dict:
    """遍历 cities/<city>/*.png 转换为同名 .webp。

    返回统计：{"converted": n, "skipped": n, "bytes_before": x, "bytes_after": y}
    """
    converted = 0
    skipped = 0
    bytes_before = 0
    bytes_after = 0

    if not os.path.isdir(cities_dir):
        return {"converted": 0, "skipped": 0, "bytes_before": 0, "bytes_after": 0}

    for city in sorted(os.listdir(cities_dir)):
        city_dir = os.path.join(cities_dir, city)
        if not os.path.isdir(city_dir) or city.startswith("."):
            continue
        for name in sorted(os.listdir(city_dir)):
            if not name.lower().endswith(".png"):
                continue
            png_path = os.path.join(city_dir, name)
            webp_path = png_path[:-4] + ".webp"

            if os.path.exists(webp_path):
                skipped += 1
                continue

            if dry_run:
                converted += 1
                bytes_before += os.path.getsize(png_path)
                continue

            with Image.open(png_path) as img:
                img.save(webp_path, "WEBP", quality=quality, method=6)

            new_size = os.path.getsize(webp_path)
            if new_size < os.path.getsize(png_path):
                bytes_before += os.path.getsize(png_path)
                bytes_after += new_size
                os.remove(png_path)
                converted += 1
            else:
                # WebP 反而更大时保留 PNG
                os.remove(webp_path)
                skipped += 1

    return {
        "converted": converted,
        "skipped": skipped,
        "bytes_before": bytes_before,
        "bytes_after": bytes_after,
    }
