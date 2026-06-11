#!/usr/bin/env python3
"""
Merge multiple Pokemon HOME screenshots into a single image.
Uses OCR to find overlapping text regions and stitches at the last matching line.

Usage:  python merge_home_screenshots.py <folder_path>
Output: <folder_name>-home.PNG saved next to the input folder
"""

import sys
import re
from pathlib import Path
from typing import Optional

import pytesseract
from PIL import Image


def get_text_lines(image: Image.Image, scale: float = 2.0) -> list[dict]:
    """Extract text lines with their y-coordinates using OCR."""
    scaled = image.resize(
        (int(image.width * scale), int(image.height * scale)),
        Image.LANCZOS,
    )
    gray = scaled.convert("L")

    data = pytesseract.image_to_data(gray, output_type=pytesseract.Output.DICT)

    lines: dict[tuple, dict] = {}
    for i in range(len(data["text"])):
        text = data["text"][i].strip()
        conf = int(data["conf"][i])
        if not text or conf < 30:
            continue

        key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        if key not in lines:
            lines[key] = {
                "text": "",
                "top": int(data["top"][i] / scale),
                "bottom": int((data["top"][i] + data["height"][i]) / scale),
            }
        lines[key]["text"] = (lines[key]["text"] + " " + text).strip()
        lines[key]["bottom"] = max(
            lines[key]["bottom"],
            int((data["top"][i] + data["height"][i]) / scale),
        )

    return sorted(lines.values(), key=lambda x: x["top"])


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().strip())


def find_last_match(
    lines1: list[dict], lines2: list[dict]
) -> tuple[Optional[dict], Optional[dict]]:
    """Return the bottommost line in lines1 that also appears in lines2."""
    lookup2 = {
        normalize(l["text"]): l for l in lines2 if len(l["text"].strip()) >= 4
    }

    last1 = last2 = None
    for line in lines1:
        norm = normalize(line["text"])
        if len(norm) >= 4 and norm in lookup2:
            last1 = line
            last2 = lookup2[norm]

    return last1, last2


def merge_pair(img1: Image.Image, img2: Image.Image) -> Image.Image:
    """Merge two images by cutting at the last overlapping text line."""
    h1, h2 = img1.height, img2.height

    # Overlap will be in the bottom portion of img1 and top portion of img2
    bottom_start = int(h1 * 0.4)
    top_end = int(h2 * 0.6)

    print("  OCR on img1 bottom portion...")
    lines1 = get_text_lines(img1.crop((0, bottom_start, img1.width, h1)))
    for line in lines1:
        line["top"] += bottom_start
        line["bottom"] += bottom_start

    print("  OCR on img2 top portion...")
    lines2 = get_text_lines(img2.crop((0, 0, img2.width, top_end)))

    if lines1:
        print(f"  img1 bottom texts: {[l['text'] for l in lines1[:6]]}")
    if lines2:
        print(f"  img2 top texts: {[l['text'] for l in lines2[:6]]}")

    match1, match2 = find_last_match(lines1, lines2)

    if match1 is None:
        print("  No match in partial regions — retrying with full images...")
        lines1_full = get_text_lines(img1)
        lines2_full = get_text_lines(img2)
        match1, match2 = find_last_match(lines1_full, lines2_full)

    if match1 is None:
        print("  WARNING: no matching text found — stacking images vertically")
        result = Image.new("RGB", (img1.width, h1 + h2))
        result.paste(img1, (0, 0))
        result.paste(img2, (0, h1))
        return result

    print(
        f"  Merge at: '{match1['text']}' "
        f"(img1 y={match1['top']}, img2 y={match2['top']})"
    )

    top_part = img1.crop((0, 0, img1.width, match1["top"]))
    bottom_part = img2.crop((0, match2["top"], img2.width, h2))

    merged_height = match1["top"] + (h2 - match2["top"])
    merged = Image.new("RGB", (img1.width, merged_height))
    merged.paste(top_part, (0, 0))
    merged.paste(bottom_part, (0, match1["top"]))
    return merged


def main() -> None:
    if len(sys.argv) != 2:
        print(f"Usage: python {Path(sys.argv[0]).name} <folder_path>")
        sys.exit(1)

    folder = Path(sys.argv[1]).resolve()
    if not folder.is_dir():
        print(f"Error: '{folder}' is not a directory")
        sys.exit(1)

    image_paths = sorted(
        list(folder.glob("*.PNG")) + list(folder.glob("*.png")),
        key=lambda p: p.name,
    )
    # Deduplicate (case-insensitive filesystems may return both)
    seen: set[str] = set()
    unique_paths = []
    for p in image_paths:
        key = p.name.upper()
        if key not in seen:
            seen.add(key)
            unique_paths.append(p)
    image_paths = unique_paths

    if len(image_paths) < 2:
        print(f"Error: need at least 2 images in '{folder}', found {len(image_paths)}")
        sys.exit(1)

    print(f"Found {len(image_paths)} images: {[p.name for p in image_paths]}")

    result = Image.open(image_paths[0]).convert("RGB")

    for i, path in enumerate(image_paths[1:], start=1):
        print(f"\n--- Merging with image {i + 1}: {path.name} ---")
        next_img = Image.open(path).convert("RGB")
        result = merge_pair(result, next_img)
        print(f"  Result size after merge: {result.size}")

    output_path = folder.parent / (folder.name + "-home.PNG")
    result.save(str(output_path))
    print(f"\nSaved: {output_path}")


if __name__ == "__main__":
    main()
