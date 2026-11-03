#!/usr/bin/env python3
"""小红书 1080x1440 封面：六种编辑式排版，标题位置/字体/装饰各自不同。"""
import json
import sys

from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1440

THEMES = {
    "classic": {"bg": "#f8f5ef", "ink": "#2b2a27", "muted": "#7a7266", "gold": "#b9975b", "accent": "#2f4a3a"},
    "warm": {"bg": "#efe6d8", "ink": "#2b2a27", "muted": "#7a7266", "gold": "#b9975b", "accent": "#2f4a3a"},
    "magazine": {"bg": "#ffffff", "ink": "#242320", "muted": "#7a7266", "gold": "#b9975b", "accent": "#8f2d2d"},
    "minimal": {"bg": "#f8f5ef", "ink": "#2b2a27", "muted": "#7a7266", "gold": "#b9975b", "accent": "#2f4a3a"},
    "film": {"bg": "#242422", "ink": "#f4efe4", "muted": "#a9a399", "gold": "#c9a86a", "accent": "#c9a86a"},
    "festive": {"bg": "#6f1f24", "ink": "#f2d79a", "muted": "#d8b98a", "gold": "#c9a86a", "accent": "#c9a86a"},
}


def font(paths, size):
    for name in paths:
        try:
            return ImageFont.truetype("C:/Windows/Fonts/" + name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def serif(size):
    return font(("simsun.ttc", "STSONG.TTF", "msyh.ttc", "simhei.ttf"), size)


def kai(size):
    return font(("simkai.ttf", "STKAITI.TTF", "STXINGKA.TTF", "simsun.ttc", "msyh.ttc"), size)


def sans(size):
    return font(("msyh.ttc", "simhei.ttf", "simsun.ttc"), size)


def spaced_width(draw, text, ft, gap):
    return sum(draw.textlength(char, font=ft) + gap for char in text) - gap


def draw_spaced(draw, text, ft, x, y, gap, fill):
    cursor = x
    for char in text:
        draw.text((cursor, y), char, font=ft, fill=fill)
        cursor += draw.textlength(char, font=ft) + gap


def wrap(draw, text, ft, max_width, max_lines=2):
    lines = []
    line = ""
    for char in text:
        probe = line + char
        if not line or draw.textlength(probe, font=ft) <= max_width:
            line = probe
        else:
            lines.append(line)
            line = char
    if line:
        lines.append(line)
    return lines[:max_lines]


def paste(canvas, path, box, radius=12, border=0, border_color="#ffffff", outline=None):
    x1, y1, x2, y2 = [int(v) for v in box]
    width, height = x2 - x1, y2 - y1
    if width <= 0 or height <= 0:
        return
    if border:
        ImageDraw.Draw(canvas).rectangle([x1 - border, y1 - border, x2 + border, y2 + border], fill=border_color)
    image = Image.open(path).convert("RGB")
    scale = max(width / image.width, height / image.height)
    resized = image.resize((max(1, int(image.width * scale)), max(1, int(image.height * scale))), Image.LANCZOS)
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    cropped = resized.crop((left, top, left + width, top + height))
    if radius:
        mask = Image.new("L", (width, height), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, width - 1, height - 1], radius=radius, fill=255)
        canvas.paste(cropped, (x1, y1), mask)
        if outline:
            ImageDraw.Draw(canvas).rounded_rectangle([x1, y1, x2 - 1, y2 - 1], radius=radius, outline=outline, width=1)
    else:
        canvas.paste(cropped, (x1, y1))


def seal(canvas, x, y, size, text, fill, text_fill):
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle([x, y, x + size, y + size], radius=3, fill=fill)
    draw.text((x + size / 2, y + size / 2), text, font=serif(int(size * 0.48)), fill=text_fill, anchor="mm")


def grain(canvas, amount=0.026):
    noise = Image.effect_noise((W, H), 6).convert("L")
    return Image.blend(canvas, Image.merge("RGB", (noise, noise, noise)), amount)


def vertical(canvas, text, x, y, ft, fill, gap):
    draw = ImageDraw.Draw(canvas)
    cursor = y
    for char in text:
        draw.text((x, cursor), char, font=ft, fill=fill)
        cursor += ft.size + gap


def classic_layout(canvas, images, title, theme, series):
    draw = ImageDraw.Draw(canvas)
    draw_spaced(draw, "江 陈 记", sans(17), 70, 50, 4, theme["muted"])
    ft = serif(48)
    lines = wrap(draw, title, ft, 800, 2)
    for index, line in enumerate(lines):
        draw.text((70, 80 + index * 60), line, font=ft, fill=theme["ink"])
    if series:
        draw_spaced(draw, series, sans(17), 70, 150, 5, theme["muted"])
    draw.line([(70, 210), (190, 210)], fill=theme["gold"], width=2)
    seal(canvas, 950, 78, 44, "记", "#a33a32", "#fffaf2")
    cells = [(60, 260, 532, 808), (548, 260, 1020, 808), (60, 824, 532, 1372), (548, 824, 1020, 1372)]
    for index, box in enumerate(cells[: min(len(images), 4)]):
        paste(canvas, images[index], box, radius=12, outline="#e6ddcf")
    if len(images) == 3:
        box = cells[3]
        draw.rounded_rectangle(box, radius=12, fill="#efe6d8", outline="#e6ddcf")
        draw.text(((box[0] + box[2]) // 2, (box[1] + box[3]) // 2 - 10), "记", font=serif(88), fill=theme["gold"], anchor="mm")
        draw_spaced(draw, "江 陈 记", sans(20), (box[0] + box[2]) // 2 - 62, (box[1] + box[3]) // 2 + 70, 3, theme["muted"])


def magazine_layout(canvas, images, title, theme, series, excerpt):
    draw = ImageDraw.Draw(canvas)
    draw_spaced(draw, "江 陈 记", sans(17), 60, 40, 4, theme["muted"])
    if excerpt:
        draw.text((1020, 34), excerpt, font=sans(17), fill=theme["muted"], anchor="ra")
    ft = serif(48)
    lines = wrap(draw, title, ft, 900, 2)
    for index, line in enumerate(lines):
        draw.text((60, 70 + index * 60), line, font=ft, fill=theme["ink"])
    if series:
        draw_spaced(draw, series, sans(17), 60, 140, 5, theme["muted"])
    draw.line([(60, 210), (240, 210)], fill=theme["gold"], width=4)
    left = (60, 260, 580, 1370)
    paste(canvas, images[0], left, radius=2)
    if len(images) == 2:
        paste(canvas, images[1], (600, 260, 1020, 753), radius=2)
    elif len(images) == 3:
        paste(canvas, images[1], (600, 260, 1020, 753), radius=2)
        paste(canvas, images[2], (600, 773, 1020, 1370), radius=2)
    else:
        for index, box in enumerate([(600, 260, 1020, 590), (600, 610, 1020, 950), (600, 970, 1020, 1350)]):
            if index + 1 < len(images):
                paste(canvas, images[index + 1], box, radius=2)


def warm_layout(canvas, images, title, theme):
    draw = ImageDraw.Draw(canvas)
    draw_spaced(draw, "江 陈 记", sans(17), 60, 50, 4, theme["muted"])
    size = 46 if len(title) <= 16 else 40 if len(title) <= 20 else 34
    vertical(canvas, title, 66, 110, serif(size), theme["ink"], 10)
    draw.line([(160, 860), (160, 1280)], fill=theme["gold"], width=1)
    seal(canvas, 66, 1310, 44, "记", "#a33a32", "#fffaf2")
    draw.text((124, 1322), "江 陈 记", font=sans(16), fill=theme["muted"])
    hero = (240, 80, 840, 880)
    paste(canvas, images[0], hero, radius=14, outline="#e2d4c0")
    if len(images) >= 4:
        for index, box in enumerate([(240, 900, 490, 1233), (510, 900, 760, 1233), (780, 900, 1030, 1233)]):
            if index + 1 < len(images):
                paste(canvas, images[index + 1], box, radius=12, outline="#e2d4c0")
    else:
        for index, box in enumerate([(280, 900, 580, 1300), (600, 900, 900, 1300)]):
            if index + 1 < len(images):
                paste(canvas, images[index + 1], box, radius=12, outline="#e2d4c0")


def festive_layout(canvas, images, title, theme):
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([24, 24, W - 24, H - 24], outline=theme["gold"], width=2)
    draw_spaced(draw, "江 陈 记", sans(17), 930, 50, 4, theme["gold"])
    size = 46 if len(title) <= 16 else 40 if len(title) <= 20 else 34
    vertical(canvas, title, 938, 110, serif(size), theme["gold"], 10)
    draw.line([(910, 860), (910, 1280)], fill=theme["gold"], width=1)
    seal(canvas, 938, 1310, 44, "记", theme["gold"], "#6f1f24")
    draw.text((930, 1370), "江 陈 记", font=sans(16), fill=theme["muted"])
    hero = (60, 80, 660, 880)
    paste(canvas, images[0], hero, radius=4, border=4, border_color=theme["gold"])
    if len(images) >= 4:
        for index, box in enumerate([(60, 900, 310, 1233), (330, 900, 580, 1233), (600, 900, 850, 1233)]):
            if index + 1 < len(images):
                paste(canvas, images[index + 1], box, radius=2, border=3, border_color=theme["gold"])
    else:
        for index, box in enumerate([(60, 900, 360, 1300), (380, 900, 680, 1300)]):
            if index + 1 < len(images):
                paste(canvas, images[index + 1], box, radius=2, border=3, border_color=theme["gold"])


def minimal_layout(canvas, images, title, theme):
    draw = ImageDraw.Draw(canvas)
    paste(canvas, images[0], (220, 60, 860, 913), radius=0)
    ft = serif(46)
    lines = wrap(draw, title, ft, 760, 2)
    start = 960
    for index, line in enumerate(lines):
        width = draw.textlength(line, font=ft)
        draw.text(((W - width) / 2, start + index * 56), line, font=ft, fill=theme["ink"])
    draw.line([(W // 2 - 28, 1080), (W // 2 + 28, 1080)], fill=theme["gold"], width=2)
    kicker = "江 陈 记"
    kw = spaced_width(draw, kicker, sans(17), 4)
    draw_spaced(draw, kicker, sans(17), (W - kw) / 2, 1100, 4, theme["muted"])
    thumbs = ([(270, 1140, 450, 1380), (465, 1140, 645, 1380), (660, 1140, 840, 1380)]
              if len(images) >= 4 else [(360, 1140, 540, 1380), (570, 1140, 750, 1380)])
    for index, box in enumerate(thumbs):
        if index + 1 < len(images):
            paste(canvas, images[index + 1], box, radius=0)


def film_layout(canvas, images, title, theme):
    draw = ImageDraw.Draw(canvas)
    draw.ellipse([50, 78, 62, 90], fill=theme["gold"])
    ft = kai(48)
    lines = wrap(draw, title, ft, 860, 2)
    for index, line in enumerate(lines):
        draw.text((80, 60 + index * 60), line, font=ft, fill=theme["ink"])
    draw_spaced(draw, "江 陈 记", sans(17), 80, 198, 4, theme["gold"])
    draw.line([(80, 226), (200, 226)], fill=theme["gold"], width=2)
    cells = [(60, 260, 532, 798), (548, 260, 1020, 798), (60, 814, 532, 1352), (548, 814, 1020, 1352)]
    for index, box in enumerate(cells[: min(len(images), 4)]):
        paste(canvas, images[index], box, radius=0, border=7, border_color="#f4efe4")
    if len(images) == 3:
        box = cells[3]
        draw = ImageDraw.Draw(canvas)
        draw.rectangle(box, fill="#2e2e2b")
        draw.text(((box[0] + box[2]) // 2, (box[1] + box[3]) // 2 - 10), "记", font=serif(84), fill=theme["gold"], anchor="mm")
        draw_spaced(draw, "江 陈 记", sans(20), (box[0] + box[2]) // 2 - 62, (box[1] + box[3]) // 2 + 66, 3, theme["muted"])


def main():
    payload = json.load(open(sys.argv[1], encoding="utf-8"))
    images = [item for item in payload.get("images", []) if item]
    title = str(payload.get("title") or "")
    series = str(payload.get("series") or "")
    excerpt = str(payload.get("excerpt") or "")
    out = payload["out"]
    style = str(payload.get("style") or "classic")
    if not images:
        raise SystemExit("no images")
    theme = THEMES.get(style, THEMES["classic"])
    canvas = Image.new("RGB", (W, H), theme["bg"])
    if style == "magazine":
        magazine_layout(canvas, images, title, theme, series, excerpt)
    elif style == "warm":
        warm_layout(canvas, images, title, theme)
    elif style == "festive":
        festive_layout(canvas, images, title, theme)
    elif style == "minimal":
        minimal_layout(canvas, images, title, theme)
    elif style == "film":
        film_layout(canvas, images, title, theme)
    else:
        classic_layout(canvas, images, title, theme, series)
    canvas = grain(canvas)
    canvas.save(out, "JPEG", quality=93)
    print("ok", out)


if __name__ == "__main__":
    main()
