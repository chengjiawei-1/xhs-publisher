#!/usr/bin/env python3
"""本地茶叶商品图自动分组：优先 OCR 识别包装产品名，颜色特征兜底。"""
import argparse
import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
THUMB_W, THUMB_H = 180, 270
PRODUCTS = ["利川红", "恩施玉露", "楚汉茶礼", "来凤藤茶", "未识别"]


def font(size):
    for name in ("msyh.ttc", "simsun.ttc", "simhei.ttf"):
        try:
            return ImageFont.truetype("C:/Windows/Fonts/" + name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def scan(folder):
    found = []
    for root, dirs, files in os.walk(folder):
        dirs.sort()
        for name in sorted(files):
            if os.path.splitext(name)[1].lower() in IMAGE_EXTS:
                found.append(os.path.join(root, name))
    return found


def color_features(path):
    image = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    image.thumbnail((224, 224), Image.Resampling.LANCZOS)
    rgb = np.asarray(image).astype(np.float32) / 255.0
    hsv = np.asarray(image.convert("HSV")).astype(np.float32) / 255.0
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    height, width = hue.shape
    yy, xx = np.mgrid[0:height, 0:width]
    cx = xx / max(1, width - 1) - 0.5
    cy = yy / max(1, height - 1) - 0.5
    weight = np.exp(-((cx * cx + cy * cy) / (2 * 0.38 * 0.38)))
    valid = (sat > 0.12) & (val > 0.10)
    green = (hue > 0.17) & (hue < 0.46) & (sat > 0.22) & (val > 0.18)
    valid = valid & ~green
    weight = weight * valid
    if weight.sum() <= 0:
        weight = np.ones_like(weight)
    hb = np.clip((hue * 16).astype(np.int32), 0, 15)
    sb = np.clip((sat * 4).astype(np.int32), 0, 3)
    vb = np.clip((val * 4).astype(np.int32), 0, 3)
    hist = np.zeros((16, 4, 4), dtype=np.float32)
    np.add.at(hist, (hb, sb, vb), weight)
    hist = hist.ravel()
    total = hist.sum()
    hist = np.sqrt(hist / total) if total > 0 else hist
    mean = (rgb[valid].mean(axis=0) if valid.any() else rgb.reshape(-1, 3).mean(axis=0))
    norm = np.linalg.norm(hist)
    if norm > 0:
        hist = hist / norm
    return hist, mean


def ocr_product(path, engine):
    if engine is None:
        return ""
    image = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    result, _ = engine(image)
    text = "".join(str(item[1]) for item in (result or []))
    compact = text.replace(" ", "")
    if "楚汉" in compact:
        return "楚汉茶礼"
    if "恩施" in compact or "玉露" in compact or "悬施" in compact or "玉 露" in compact:
        return "恩施玉露"
    if "利川" in compact or "利 川" in compact:
        return "利川红"
    if "藤茶" in compact or "来凤" in compact or "来 凤" in compact:
        return "来凤藤茶"
    return ""


def thumb(path):
    image = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    return ImageOps.fit(image, (THUMB_W, THUMB_H), Image.Resampling.LANCZOS)


def group_sheet(paths, out, label, limit=30):
    columns = 6
    rows = max(1, math.ceil(min(len(paths), limit) / columns))
    header = 54
    width = columns * THUMB_W + (columns + 1) * 10
    height = header + rows * (THUMB_H + 30) + 20
    canvas = Image.new("RGB", (width, height), "#f7f5f0")
    draw = ImageDraw.Draw(canvas)
    draw.text((20, 14), label + " · " + str(len(paths)) + " 张（显示前 " + str(min(len(paths), limit)) + " 张）", font=font(24), fill="#2b2a27")
    for index, path in enumerate(paths[:limit]):
        row = index // columns
        column = index % columns
        x = 10 + column * (THUMB_W + 10)
        y = header + row * (THUMB_H + 30)
        try:
            canvas.paste(thumb(path), (x, y))
        except Exception:
            continue
        draw.text((x, y + THUMB_H + 4), os.path.basename(path)[:20], font=font(12), fill="#6f6a60")
    canvas.save(out, "JPEG", quality=88)


def summary_sheet(groups, out):
    card_w, card_h = 340, 300
    columns = 3
    rows = max(1, math.ceil(len(groups) / columns))
    canvas = Image.new("RGB", (columns * card_w + 40, rows * card_h + 80), "#f7f5f0")
    draw = ImageDraw.Draw(canvas)
    draw.text((24, 18), "本地自动分组 · " + str(len(groups)) + " 组 · OCR + 颜色", font=font(28), fill="#2b2a27")
    for index, group in enumerate(groups):
        row = index // columns
        column = index % columns
        x = 20 + column * card_w
        y = 70 + row * card_h
        draw.text((x, y), group["label"] + " · " + str(group["count"]) + " 张", font=font(22), fill="#2b2a27")
        for sub, path in enumerate(group["images"][:4]):
            try:
                canvas.paste(thumb(path).resize((80, 120), Image.Resampling.LANCZOS), (x + sub * 84, y + 40))
            except Exception:
                continue
    canvas.save(out, "JPEG", quality=90)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--folder", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--no-ocr", action="store_true")
    args = parser.parse_args()
    folder = os.path.abspath(args.folder)
    out = os.path.abspath(args.out)
    os.makedirs(out, exist_ok=True)
    paths = scan(folder)
    if not paths:
        raise SystemExit("no images")
    engine = None
    if not args.no_ocr:
        try:
            from rapidocr_onnxruntime import RapidOCR
            engine = RapidOCR()
        except Exception:
            engine = None
    records = []
    for path in paths:
        try:
            vector, mean = color_features(path)
            product = ocr_product(path, engine)
            records.append({"path": path, "vector": vector, "mean": mean, "product": product})
        except Exception:
            continue
    for record in records:
        if not record["product"]:
            record["product"] = "未识别"
    groups = []
    for product in PRODUCTS:
        members = [record for record in records if record["product"] == product]
        if not members:
            continue
        groups.append({"label": product, "count": len(members), "images": [record["path"] for record in members]})
    groups.sort(key=lambda item: item["count"], reverse=True)
    for index, group in enumerate(groups):
        sheet = os.path.join(out, "group-" + str(index + 1) + ".jpg")
        group_sheet(group["images"], sheet, group["label"])
        group["sheet"] = sheet
    summary = os.path.join(out, "summary.jpg")
    summary_sheet(groups, summary)
    result = {"ok": True, "folder": folder, "out": out, "count": len(records), "groups": groups, "summary": summary, "ocr": bool(engine)}
    with open(os.path.join(out, "groups.json"), "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
    print(json.dumps({"ok": True, "out": out, "count": len(records), "groups": [{"label": group["label"], "count": group["count"], "sheet": group["sheet"]} for group in groups], "summary": summary, "ocr": bool(engine)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
