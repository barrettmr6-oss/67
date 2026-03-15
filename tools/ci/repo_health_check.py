#!/usr/bin/env python3
"""Repository health checks for CI."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

REQUIRED_PATHS = [
    ROOT / "README.md",
    ROOT / ".github/workflows/repo-health.yml",
    ROOT / ".github/ISSUE_TEMPLATE/gameplay-bug.yml",
    ROOT / ".github/ISSUE_TEMPLATE/performance-regression.yml",
    ROOT / ".github/ISSUE_TEMPLATE/asset-integration.yml",
    ROOT / "docs/milestones/vertical-slice.md",
    ROOT / "docs/milestones/production.md",
]

RECOMMENDED_DIRS = ["Config", "Content", "Source"]


def detect_engine() -> str:
    if any(ROOT.glob("*.uproject")):
        return "unreal"
    if (ROOT / "ProjectSettings/ProjectVersion.txt").exists():
        return "unity"
    return "unknown"


def check_required_paths() -> list[str]:
    failures: list[str] = []
    for path in REQUIRED_PATHS:
        if not path.exists():
            failures.append(f"Missing required path: {path.relative_to(ROOT)}")
    return failures


def check_recommended_dirs() -> None:
    for dirname in RECOMMENDED_DIRS:
        if not (ROOT / dirname).exists():
            print(f"[warn] Recommended directory not found: {dirname}")


def run_unreal_checks() -> list[str]:
    failures: list[str] = []
    uproject_paths = list(ROOT.glob("*.uproject"))
    if not uproject_paths:
        return failures

    for project in uproject_paths:
        try:
            data = json.loads(project.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            failures.append(f"Invalid JSON in {project.name}: {exc}")
            continue

        if "Modules" not in data:
            print(f"[warn] {project.name} has no Modules entry")

    uat = shutil.which("RunUAT") or shutil.which("RunUAT.bat")
    if uat:
        print("[info] Running Unreal AutomationTool help (non-interactive)")
        cmd = [uat, "-Help"]
        result = subprocess.run(cmd, cwd=ROOT, check=False, text=True, capture_output=True)
        if result.returncode != 0:
            failures.append("RunUAT -Help failed")
    else:
        print("[warn] Unreal AutomationTool not found in CI environment; skipping command checks")

    return failures


def run_unity_checks() -> list[str]:
    failures: list[str] = []
    unity = shutil.which("unity-editor") or shutil.which("Unity")
    if unity:
        print("[info] Unity editor detected; version check")
        result = subprocess.run([unity, "-version"], cwd=ROOT, check=False, text=True, capture_output=True)
        if result.returncode != 0:
            failures.append("Unity -version failed")
    else:
        print("[warn] Unity editor not found in CI environment; skipping command checks")
    return failures


def main() -> int:
    print("== Repository health checks ==")
    failures = check_required_paths()
    check_recommended_dirs()

    engine = detect_engine()
    print(f"Detected engine: {engine}")
    if engine == "unreal":
        failures.extend(run_unreal_checks())
    elif engine == "unity":
        failures.extend(run_unity_checks())
    else:
        print("[warn] Engine not detected; running structure-only validation")

    if failures:
        print("\nFAILURES:")
        for failure in failures:
            print(f" - {failure}")
        return 1

    print("All required repository health checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
