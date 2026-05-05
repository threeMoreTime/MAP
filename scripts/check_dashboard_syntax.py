"""
Dashboard 内联 JavaScript 语法检查
从 dashboard.html 提取 <script> 内联代码，用 node --check 校验
"""
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DASHBOARD = os.path.join(ROOT, "dashboard.html")


def extract_inline_scripts(html):
    pattern = re.compile(r"<script[^>]*>(.*?)</script>", re.DOTALL)
    scripts = []
    for m in pattern.finditer(html):
        tag = m.group(0)
        if 'src=' in tag.split('>')[0]:
            continue
        content = m.group(1).strip()
        if content:
            scripts.append(content)
    return scripts


def main():
    if not os.path.exists(DASHBOARD):
        print(f"[ERROR] dashboard.html not found: {DASHBOARD}")
        sys.exit(1)

    with open(DASHBOARD, "r", encoding="utf-8") as f:
        html = f.read()

    scripts = extract_inline_scripts(html)
    print(f"Extracted {len(scripts)} inline <script> blocks from dashboard.html")

    if not scripts:
        print("[ERROR] No inline scripts found")
        sys.exit(1)

    try:
        subprocess.run(["node", "--version"], capture_output=True, check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("[ERROR] node not found. Install Node.js to run syntax checks.")
        sys.exit(1)

    errors = 0
    for i, code in enumerate(scripts):
        fd, tmp = tempfile.mkstemp(suffix=".js", prefix=f"dashboard_block{i}_")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(code)
            result = subprocess.run(
                ["node", "--check", tmp],
                capture_output=True, text=True,
            )
            if result.returncode != 0:
                errors += 1
                print(f"  [FAIL] Block {i + 1}:")
                for line in result.stderr.strip().splitlines():
                    print(f"    {line}")
            else:
                print(f"  [PASS] Block {i + 1}")
        finally:
            os.unlink(tmp)

    print()
    if errors:
        print(f"Result: FAIL ({errors} block(s) with syntax errors)")
        sys.exit(1)
    else:
        print(f"Result: PASS ({len(scripts)} blocks, no errors)")
        sys.exit(0)


if __name__ == "__main__":
    main()
