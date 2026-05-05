"""
总验收入口脚本
按顺序执行：
  1. build_data_index.py  — 构建数据索引
  2. validate_data.py     — 校验数据完整性
  3. check_dashboard_syntax.py — JS 语法检查
  4. acceptance_dashboard.js   — 浏览器真实验收
"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(ROOT, "scripts")

STEPS = [
    {
        "name": "Step 1/4: Build Data Index",
        "cmd": [sys.executable, os.path.join(SCRIPTS, "build_data_index.py")],
    },
    {
        "name": "Step 2/4: Validate Data",
        "cmd": [sys.executable, os.path.join(SCRIPTS, "validate_data.py")],
    },
    {
        "name": "Step 3/4: Dashboard Syntax Check",
        "cmd": [sys.executable, os.path.join(SCRIPTS, "check_dashboard_syntax.py")],
    },
    {
        "name": "Step 4/4: Browser Acceptance",
        "cmd": ["node", os.path.join(SCRIPTS, "acceptance_dashboard.js")],
    },
]


def run_step(step):
    print()
    print("=" * 55)
    print(f"  {step['name']}")
    print("=" * 55)
    result = subprocess.run(step["cmd"], cwd=ROOT)
    return result.returncode == 0


def main():
    print("=" * 55)
    print("  Phase 3 Acceptance Suite")
    print("=" * 55)

    for step in STEPS:
        ok = run_step(step)
        if not ok:
            print()
            print(f"[FAIL] {step['name']} failed. Stopping.")
            sys.exit(1)

    print()
    print("=" * 55)
    print("  Phase 3 acceptance PASS")
    print("=" * 55)
    sys.exit(0)


if __name__ == "__main__":
    main()
