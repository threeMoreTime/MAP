#!/usr/bin/env python3
"""为前端标题字体生成 Noto Serif SC 子集 woff2。

用法:
    python scripts/subset_font.py [源字体.ttf] [输出.woff2]

字符集 = 前端源码中出现的全部汉字 + 50 城市中文名 + ASCII 可见字符 +
常用中文标点。源字体为 google/fonts 仓库的 Noto Serif SC 可变字重版（OFL 许可），
子集保留 wght 200-900 变量轴，font-display: swap 下按需取用。

再生成流程:
    curl -L -o .tmp/NotoSerifSC-var.ttf \\
      "https://github.com/google/fonts/raw/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf"
    python scripts/subset_font.py .tmp/NotoSerifSC-var.ttf \\
      frontend/src/assets/fonts/noto-serif-sc-subset.woff2
"""
import re
import sys
from pathlib import Path

from fontTools.subset import Options, Subsetter, load_font, save_font

ROOT = Path(__file__).resolve().parent.parent
FRONTEND_SRC = ROOT / "frontend" / "src"

# 汉字 / 中文标点 / ASCII 可见区
CJK_RE = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf]")
CN_PUNCT = "，。、；：？！「」『』（）《》〈〉【】…—·＋－×÷％℃"
ASCII_VISIBLE = "".join(chr(c) for c in range(0x20, 0x7F))

# 城市中文名数据源（前端展示依赖的数据字段）
DATA_FILES = [ROOT / "frontend" / "public" / "data" / "latest" / "metro_stats.json"]


def collect_chars() -> str:
    chars = set(ASCII_VISIBLE) | set(CN_PUNCT)

    for path in FRONTEND_SRC.rglob("*"):
        if path.suffix in (".ts", ".tsx", ".css"):
            text = path.read_text(encoding="utf-8", errors="ignore")
            chars.update(CJK_RE.findall(text))

    for path in DATA_FILES:
        if path.exists():
            text = path.read_text(encoding="utf-8", errors="ignore")
            chars.update(CJK_RE.findall(text))

    # 兜底：确保候选覆盖后仍缺的常用导航/单位字
    chars.update("地铁客流城市数据线路规划年度趋势对比质量说明关于里程站点强度峰值在建万人座条千米厘")

    return "".join(sorted(chars))


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / ".tmp" / "NotoSerifSC-var.ttf"
    out = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else FRONTEND_SRC / "assets" / "fonts" / "noto-serif-sc-subset.woff2"
    )

    if not src.exists():
        sys.exit(f"源字体不存在: {src}")

    chars = collect_chars()
    print(f"字符集大小: {len(chars)}")

    font = load_font(str(src), Options())
    # 保留变量字重轴与 woff2 压缩
    opts = Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = [1, 2, 3, 4, 6]
    opts.notdef_outline = True

    subsetter = Subsetter(options=opts)
    subsetter.populate(text=chars)
    subsetter.subset(font)

    out.parent.mkdir(parents=True, exist_ok=True)
    save_font(font, str(out), opts)
    size_kb = out.stat().st_size / 1024
    print(f"输出: {out} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
