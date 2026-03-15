#!/usr/bin/env python3
"""Lightweight static checks for scripts and source conventions."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CS_EXT = {".cs"}
CPP_EXT = {".cpp", ".cc", ".cxx", ".h", ".hpp"}

BP_ALLOWED_PREFIXES = (
    "BP_",
    "ABP_",
    "WBP_",
    "BPI_",
    "BT_",
    "MAT_",
    "MI_",
    "T_",
    "SFX_",
    "VFX_",
)


def iter_files() -> list[Path]:
    files = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if ".git" in path.parts:
            continue
        if path.suffix.lower() in CS_EXT | CPP_EXT:
            files.append(path)
    return files


def check_csharp(path: Path, text: str) -> list[str]:
    failures: list[str] = []
    if "\t" in text:
        failures.append(f"{path.relative_to(ROOT)}: tab character found; use spaces")
    if "class " in text and "namespace " not in text:
        failures.append(f"{path.relative_to(ROOT)}: class declared without namespace")
    return failures


def check_cpp(path: Path, text: str) -> list[str]:
    failures: list[str] = []
    rel = path.relative_to(ROOT)
    if path.suffix.lower() in {".h", ".hpp"}:
        if "#pragma once" not in text:
            failures.append(f"{rel}: header missing #pragma once")
    if re.search(r"\busing\s+namespace\s+std\s*;", text):
        failures.append(f"{rel}: avoid 'using namespace std;' in shared code")
    return failures


def check_blueprint_names() -> list[str]:
    failures: list[str] = []
    content_dir = ROOT / "Content"
    if not content_dir.exists():
        return failures

    for uasset in content_dir.rglob("*.uasset"):
        name = uasset.stem
        if not name.startswith(BP_ALLOWED_PREFIXES):
            failures.append(
                f"{uasset.relative_to(ROOT)}: unexpected asset prefix; expected one of {BP_ALLOWED_PREFIXES}"
            )
    return failures


def main() -> int:
    print("== Script/static convention checks ==")
    failures: list[str] = []

    files = iter_files()
    if not files:
        print("No C# or C++ source files found; skipping language checks.")

    for path in files:
        text = path.read_text(encoding="utf-8", errors="ignore")
        if path.suffix.lower() in CS_EXT:
            failures.extend(check_csharp(path, text))
        if path.suffix.lower() in CPP_EXT:
            failures.extend(check_cpp(path, text))

    failures.extend(check_blueprint_names())

    if failures:
        print("\nFAILURES:")
        for failure in failures:
            print(f" - {failure}")
        return 1

    print("All static convention checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
