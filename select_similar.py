#!/usr/bin/env python3
"""按模板从产品组里选 4-5 张：pHash 去重 + 最远点采样保证角度差异 + 角色分配。"""
import argparse
import json
import math
import os
import sys

import imagehash
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from group_images import color_features, thumb, font  # noqa: E402

PRODUCT_ACCOUNT = {"利川红": "default", "恩施玉露": "账号B", "楚汉茶礼": "账号A"}
THUMB_W, THUMB_H = 180, 270


def image_stats(path):
    image = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    image.thumbnail((224, 224), Image.Resampling.LANCZOS)
    rgb = np.asarray(image).astype(np.float32) / 255.0
    hsv = np.asarray(image.convert("HSV")).astype(np.float32) / 255.0
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    valid = (sat > 0.12) & (val > 0.10)
    green = (hue > 0.17) & (hue < 0.46) & (sat > 0.22) & (val > 0.18)
    product_valid = valid & ~green
    hand = (rgb[..., 0] > 0.42) & (rgb[..., 0] > rgb[..., 1] * 1.05) & (rgb[..., 0] > rgb[..., 2] * 1.10) & (sat > 0.15) & (val > 0.35)
    total = max(1, int(valid.sum()))
    return {
        "productRatio": float(product_valid.sum()) / total,
        "handRatio": float(hand.sum()) / total,
        "saturation": float(sat[product_valid].mean()) if product_valid.any() else 0.0,
    }


def hamming(left, right):
    return left - right


def build_records(images):
    records = []
    for path in images:
        try:
            vector, mean = color_features(path)
            stats = image_stats(path)
            digest = imagehash.phash(ImageOps.exif_transpose(Image.open(path)).convert("L"))
            records.append({"path": path, "vector": vector, "mean": mean, "hash": digest, **stats})
        except Exception:
            continue
    return records


def duplicate_clusters(records, min_distance):
    parent = list(range(len(records)))

    def find(index):
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left, right):
        root_left, root_right = find(left), find(right)
        if root_left != root_right:
            parent[root_left] = root_right

    for i in range(len(records)):
        for j in range(i + 1, len(records)):
            if hamming(records[i]["hash"], records[j]["hash"]) <= min_distance:
                union(i, j)
    clusters = {}
    for index in range(len(records)):
        clusters.setdefault(find(index), []).append(index)
    return list(clusters.values())


def kmeans(x, k, seed):
    rng = np.random.default_rng(seed)
    centers = [x[rng.integers(0, len(x))]]
    for _ in range(1, k):
        distances = np.min([((x - center) ** 2).sum(axis=1) for center in centers], axis=0)
        if distances.sum() <= 0:
            centers.append(x[rng.integers(0, len(x))])
            continue
        centers.append(x[rng.choice(len(x), p=distances / distances.sum())])
    centers = np.array(centers, dtype=np.float32)
    labels = np.zeros(len(x), dtype=np.int32)
    for _ in range(35):
        distances = ((x[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
        labels = distances.argmin(axis=1)
        updated = []
        for index in range(k):
            subset = x[labels == index]
            updated.append(subset.mean(axis=0) if len(subset) else centers[index])
        updated = np.array(updated, dtype=np.float32)
        if np.allclose(updated, centers, atol=1e-5):
            centers = updated
            break
        centers = updated
    distances = ((x[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
    return labels, centers, float(np.min(distances, axis=1).sum())


def best_kmeans(x, k, restarts=8):
    best = None
    for seed in range(restarts):
        labels, centers, inertia = kmeans(x, k, seed)
        if best is None or inertia < best[2]:
            best = (labels, centers, inertia)
    return best


def choose_clusters(records, per_post, min_distance):
    """取最大的 per_post 个视觉簇，每簇一张代表图；先排除离群图。"""
    x = np.array([record["vector"] for record in records], dtype=np.float32)
    centroid = x.mean(axis=0)
    distances = np.linalg.norm(x - centroid, axis=1)
    limit = float(np.percentile(distances, 80))
    core = [index for index in range(len(records)) if distances[index] <= limit]
    if len(core) < per_post:
        core = list(range(len(records)))
    core_records = [records[index] for index in core]
    core_x = x[core]
    k = max(per_post + 1, min(8, len(core_records) // 10))
    k = min(k, len(core_records))
    labels, centers, _ = best_kmeans(core_x, k)
    clusters = {}
    for index, label in enumerate(labels):
        clusters.setdefault(int(label), []).append(index)
    ordered = sorted(clusters.values(), key=lambda members: len(members), reverse=True)
    selected = []
    for members in ordered:
        if len(selected) >= per_post:
            break
        center = core_x[members].mean(axis=0)
        best = max(members, key=lambda index: core_records[index]["productRatio"] - float(np.linalg.norm(core_x[index] - center)) * 0.08)
        selected.append(core_records[best])
    return selected


def choose_diverse(records, per_post, min_distance):
    x = np.array([record["vector"] for record in records], dtype=np.float32)
    clusters = duplicate_clusters(records, min_distance)
    reps = [max(members, key=lambda index: records[index]["productRatio"]) for members in clusters]
    centroid = x.mean(axis=0)
    first = min(reps, key=lambda index: float(np.linalg.norm(x[index] - centroid)))
    selected = [first]
    pool = [index for index in reps if index != first]
    while len(selected) < per_post and pool:
        next_index = max(pool, key=lambda index: min(float(np.linalg.norm(x[index] - x[other])) for other in selected))
        selected.append(next_index)
        pool.remove(next_index)
    if len(selected) < per_post:
        rest = [index for index in range(len(records)) if index not in selected]
        while len(selected) < per_post and rest:
            next_index = max(rest, key=lambda index: min(float(np.linalg.norm(x[index] - x[other])) for other in selected))
            selected.append(next_index)
            rest.remove(next_index)
    return [records[index] for index in selected]


def assign_roles(selected, roles):
    if not selected:
        return []
    remaining = selected[:]
    result = []
    # 手提：手部占比最高
    if "手提" in roles or "手提/场景" in roles:
        hand = max(remaining, key=lambda record: record["handRatio"])
        if hand["handRatio"] > 0.01:
            result.append((hand, "手提"))
            remaining.remove(hand)
    if "封面" in roles and remaining:
        cover = max(remaining, key=lambda record: record["productRatio"])
        result.append((cover, "封面"))
        remaining.remove(cover)
    if ("细节" in roles) and remaining:
        detail = max(remaining, key=lambda record: record["saturation"])
        result.append((detail, "细节"))
        remaining.remove(detail)
    for record in remaining:
        role = next((role for role in roles if role not in [item[1] for item in result]), "补充")
        result.append((record, role))
    return result[: len(selected)]


def sheet(items, out, label):
    columns = len(items)
    width = max(columns, 1) * THUMB_W + (max(columns, 1) + 1) * 10
    height = 120 + THUMB_H + 40
    canvas = Image.new("RGB", (width, height), "#f7f5f0")
    draw = ImageDraw.Draw(canvas)
    draw.text((18, 16), label + " · " + str(len(items)) + " 张", font=font(24), fill="#2b2a27")
    for index, (record, role) in enumerate(items):
        x = 10 + index * (THUMB_W + 10)
        y = 70
        try:
            canvas.paste(thumb(record["path"]), (x, y))
        except Exception:
            continue
        draw.text((x, y + THUMB_H + 4), role + " · " + os.path.basename(record["path"])[:16], font=font(12), fill="#6f6a60")
    canvas.save(out, "JPEG", quality=90)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--groups", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--per-post", type=int, default=4)
    parser.add_argument("--posts-per-group", type=int, default=1)
    parser.add_argument("--min-hash-distance", type=int, default=8)
    parser.add_argument("--strategy", default="cluster")
    parser.add_argument("--roles", default="封面,包装,手提,细节")
    args = parser.parse_args()
    data = json.load(open(args.groups, encoding="utf-8"))
    out = os.path.abspath(args.out)
    os.makedirs(out, exist_ok=True)
    per_post = max(3, min(5, args.per_post))
    roles = [role.strip() for role in args.roles.split(",") if role.strip()]
    posts = []
    for group in data.get("groups", []):
        if group.get("label") == "未识别":
            continue
        records = build_records(group.get("images", []))
        if not records:
            continue
        for _ in range(max(1, args.posts_per_group)):
            selected = choose_diverse(records, per_post, args.min_hash_distance) if args.strategy == "diverse" else choose_clusters(records, per_post, args.min_hash_distance)
            if not selected:
                break
            items = assign_roles(selected, roles)
            posts.append({
                "product": group.get("label", ""),
                "account": PRODUCT_ACCOUNT.get(group.get("label", ""), "default"),
                "images": [record["path"] for record, _ in items],
                "roles": [role for _, role in items],
                "count": len(items),
            })
            records = [record for record in records if record["path"] not in [item[0]["path"] for item in items]]
            if not records:
                break
    for index, post in enumerate(posts):
        path = os.path.join(out, "post-" + str(index + 1) + ".jpg")
        items = [(record, role) for record, role in zip(build_records(post["images"]), post["roles"])]
        sheet(items, path, post["product"] + " · " + post["account"])
        post["sheet"] = path
    result = {"ok": True, "perPost": per_post, "postsPerGroup": args.posts_per_group, "posts": posts}
    with open(os.path.join(out, "selected.json"), "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
    print(json.dumps({"ok": True, "out": out, "posts": posts}, ensure_ascii=False))


if __name__ == "__main__":
    main()
