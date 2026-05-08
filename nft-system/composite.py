"""
HOUNDS OF HELL — Python Compositing Engine
Uses the approved base hound (#048) and programmatically generates
666 unique NFTs by compositing: background + recolored base + trait overlays.

Approach:
1. Load base hound image
2. Remove background (green screen or alpha)
3. Recolor fur based on trait (hue rotation + color replacement)
4. Composite: background → recolored hound → eye overlay → horn overlay → collar overlay → tail overlay → special overlay
5. Save final 1024x1024 PNG
"""

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import numpy as np
import json
import os
import math
import colorsys

# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = "/home/z/my-project/nft-system"
BASE_IMAGE = os.path.join(BASE_DIR, "base_hound_source.png")  # Will be created
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
SIZE = 1024

# ============================================================
# COLOR DEFINITIONS FOR FUR RECOLORING
# ============================================================

FUR_COLORS = {
    "Shadow Black":   {"hue_shift": 0,    "saturation": 0.1, "brightness": 0.15, "glow_color": None},
    "Blood Red":      {"hue_shift": 0,    "saturation": 0.9, "brightness": 0.35, "glow_color": (200, 30, 30)},
    "Bone White":     {"hue_shift": 0,    "saturation": 0.05, "brightness": 0.85, "glow_color": (180, 170, 150)},
    "Inferno Orange": {"hue_shift": 30,   "saturation": 0.9, "brightness": 0.55, "glow_color": (255, 140, 0)},
    "Toxic Green":    {"hue_shift": 120,  "saturation": 0.8, "brightness": 0.40, "glow_color": (0, 255, 80)},
    "Frost Blue":     {"hue_shift": 210,  "saturation": 0.7, "brightness": 0.55, "glow_color": (100, 180, 255)},
    "Void Purple":    {"hue_shift": 270,  "saturation": 0.7, "brightness": 0.35, "glow_color": (120, 0, 200)},
    "Ember Glow":     {"hue_shift": 20,   "saturation": 0.3, "brightness": 0.20, "glow_color": (255, 100, 0)},  # black + orange cracks
    "Ghost":          {"hue_shift": 0,    "saturation": 0.0, "brightness": 0.75, "glow_color": (150, 200, 255), "alpha": 0.6},
    "Molten Gold":    {"hue_shift": 45,   "saturation": 0.9, "brightness": 0.65, "glow_color": (255, 215, 0)},
    "Shadow Flame":   {"hue_shift": 280,  "saturation": 0.6, "brightness": 0.25, "glow_color": (180, 0, 120)},
    "Cosmic":         {"hue_shift": 260,  "saturation": 0.5, "brightness": 0.40, "glow_color": (100, 50, 200)},
}

# ============================================================
# BACKGROUND COLORS (solid gradient backgrounds)
# ============================================================

BG_COLORS = {
    "Inferno":     {"top": (60, 0, 0),     "bottom": (120, 20, 0),   "accent": (255, 80, 0)},
    "Void":        {"top": (10, 5, 30),     "bottom": (20, 10, 50),   "accent": (80, 40, 120)},
    "Ashes":       {"top": (40, 40, 40),    "bottom": (70, 65, 60),   "accent": (130, 120, 110)},
    "Lava":        {"top": (80, 20, 0),     "bottom": (40, 10, 0),    "accent": (255, 160, 0)},
    "Ice Hell":    {"top": (10, 30, 60),    "bottom": (20, 50, 80),   "accent": (80, 160, 255)},
    "Bone Yard":   {"top": (30, 28, 20),    "bottom": (50, 45, 35),   "accent": (160, 150, 120)},
    "Storm":       {"top": (15, 10, 40),    "bottom": (30, 20, 60),   "accent": (180, 80, 255)},
    "Blood Moon":  {"top": (40, 0, 15),     "bottom": (80, 0, 30),    "accent": (255, 0, 60)},
    "Plasma":      {"top": (5, 20, 30),     "bottom": (10, 40, 50),   "accent": (0, 255, 140)},
    "The Abyss":   {"top": (0, 0, 0),       "bottom": (5, 0, 0),      "accent": (200, 0, 0)},
}

# ============================================================
# CORE FUNCTIONS
# ============================================================

def create_background(name, size=1024):
    """Create a gradient background with accent glow"""
    colors = BG_COLORS.get(name, BG_COLORS["Void"])
    img = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    
    # Vertical gradient
    for y in range(size):
        ratio = y / size
        r = int(colors["top"][0] * (1 - ratio) + colors["bottom"][0] * ratio)
        g = int(colors["top"][1] * (1 - ratio) + colors["bottom"][1] * ratio)
        b = int(colors["top"][2] * (1 - ratio) + colors["bottom"][2] * ratio)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
    
    # Accent glow (radial gradient at center-bottom)
    accent = colors["accent"]
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    
    cx, cy = size // 2, int(size * 0.65)
    for r in range(300, 0, -2):
        alpha = int(30 * (1 - r / 300))
        glow_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(accent[0], accent[1], accent[2], alpha))
    
    img = Image.alpha_composite(img, glow)
    return img


def remove_background_smart(img_path):
    """Remove background from base hound image using color-based segmentation.
    Works with the base hound #048 which has a dark background."""
    img = Image.open(img_path).convert("RGBA")
    data = np.array(img)
    
    # The hound is dark/black, backgrounds are lighter/colored
    # Strategy: detect the hound body (dark pixels) and keep them
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    
    # Calculate brightness
    brightness = (r.astype(float) + g.astype(float) + b.astype(float)) / 3
    
    # Create mask: keep dark pixels (hound body) and orange/glowing pixels (cracks/eyes)
    # Dark pixels = hound body
    dark_mask = brightness < 80
    
    # Orange/glowing pixels (ember cracks, eyes)
    orange_mask = (r > 150) & (g < 120) & (b < 80)
    
    # Bright accent pixels (eyes, glow)
    glow_mask = (r > 180) & (g > 80) & (b < 100)
    
    # Combine masks
    keep_mask = dark_mask | orange_mask | glow_mask
    
    # Also keep near-black pixels that are part of outlines
    outline_mask = (r < 40) & (g < 40) & (b < 40)
    keep_mask = keep_mask | outline_mask
    
    # Apply mask
    result = data.copy()
    result[:,:,3] = np.where(keep_mask, 255, 0).astype(np.uint8)
    
    return Image.fromarray(result)


def recolor_fur(base_rgba, fur_name):
    """Recolor the hound's fur while preserving glowing effects and outlines.
    
    Strategy:
    - Black/dark pixels → recolored to new fur color
    - Orange/glowing pixels → adjusted to match new fur's glow color
    - Outlines stay dark
    """
    if fur_name not in FUR_COLORS:
        fur_name = "Shadow Black"
    
    config = FUR_COLORS[fur_name]
    data = np.array(base_rgba).copy()
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    
    brightness = (r.astype(float) + g.astype(float) + b.astype(float)) / 3
    
    # 1. Dark fur pixels (brightness 20-80, alpha > 0) → recolor
    fur_mask = (brightness < 80) & (brightness > 15) & (a > 0)
    
    # For non-Ember/Ghost furs, replace dark areas with solid fur color
    if "glow_color" in config and config["glow_color"] and fur_name not in ["Ember Glow", "Shadow Flame", "Cosmic"]:
        target_r, target_g, target_b = config["glow_color"]
        # Blend: darker pixels get darker version of color
        blend = brightness / 80.0  # 0-1 scale
        data[:,:,0] = np.where(fur_mask, (target_r * blend * 0.6).astype(np.uint8), data[:,:,0])
        data[:,:,1] = np.where(fur_mask, (target_g * blend * 0.6).astype(np.uint8), data[:,:,1])
        data[:,:,2] = np.where(fur_mask, (target_b * blend * 0.6).astype(np.uint8), data[:,:,2])
    
    # 2. Orange/glowing pixels → recolor to new glow color
    if config.get("glow_color") and fur_name != "Ember Glow":
        glow_target = config["glow_color"]
        orange_mask = (r > 120) & (g < 130) & (b < 80) & (a > 0)
        # Keep glow intensity but shift color
        glow_intensity = np.clip(r.astype(float) / 255, 0, 1)
        data[:,:,0] = np.where(orange_mask, (glow_target[0] * glow_intensity).astype(np.uint8), data[:,:,0])
        data[:,:,1] = np.where(orange_mask, (glow_target[1] * glow_intensity).astype(np.uint8), data[:,:,1])
        data[:,:,2] = np.where(orange_mask, (glow_target[2] * glow_intensity).astype(np.uint8), data[:,:,2])
    
    # 3. Ghost fur — make semi-transparent
    if config.get("alpha"):
        data[:,:,3] = np.where(brightness < 80, (data[:,:,3] * config["alpha"]).astype(np.uint8), data[:,:,3])
    
    result = Image.fromarray(data)
    return result


def add_eyes_overlay(base_img, eye_trait):
    """Draw eyes over the base hound based on eye trait.
    The base hound has glowing orange eyes at a known position."""
    img = base_img.copy()
    draw = ImageDraw.Draw(img)
    
    # Precise eye positions from base hound analysis
    left_eye_center = (396, 350)
    right_eye_center = (625, 350)
    eye_radius = 28
    
    eye_colors = {
        "Crimson":       (220, 30, 30),
        "Gold":          (255, 215, 0),
        "Heterochromia": None,  # left red, right gold
        "Laser":         (255, 0, 0),
        "Void":          (0, 0, 0),
        "Cyclops":       (128, 0, 200),
        "Soul Fire":     (100, 180, 255),
        "Snake":         (0, 200, 0),
        "X Marks":       (255, 255, 255),
        "Third Eye":     (180, 0, 255),
        "Hypnotic":      (0, 200, 200),
    }
    
    if eye_trait == "Cyclops":
        # Single large eye at center of forehead
        cx, cy = 512, 290
        draw.ellipse([cx-50, cy-50, cx+50, cy+50], fill=(128, 0, 200, 200))
        draw.ellipse([cx-20, cy-20, cx+20, cy+20], fill=(255, 255, 255, 200))
        draw.ellipse([cx-8, cy-8, cx+8, cy+8], fill=(0, 0, 0, 255))
    elif eye_trait == "Heterochromia":
        # Left red, right gold
        draw.ellipse([left_eye_center[0]-eye_radius, left_eye_center[1]-eye_radius,
                      left_eye_center[0]+eye_radius, left_eye_center[1]+eye_radius], fill=(220, 30, 30, 200))
        draw.ellipse([right_eye_center[0]-eye_radius, right_eye_center[1]-eye_radius,
                      right_eye_center[0]+eye_radius, right_eye_center[1]+eye_radius], fill=(255, 215, 0, 200))
    elif eye_trait == "Laser":
        # Glowing red with laser beams
        for cx, cy in [left_eye_center, right_eye_center]:
            draw.ellipse([cx-eye_radius, cy-eye_radius, cx+eye_radius, cy+eye_radius], fill=(255, 0, 0, 220))
            # Laser beams going right
            draw.rectangle([cx+eye_radius, cy-3, 1024, cy+3], fill=(255, 50, 50, 180))
    elif eye_trait == "Void":
        # Completely black
        for cx, cy in [left_eye_center, right_eye_center]:
            draw.ellipse([cx-eye_radius, cy-eye_radius, cx+eye_radius, cy+eye_radius], fill=(0, 0, 0, 255))
    elif eye_trait == "X Marks":
        # X-shaped eyes
        for cx, cy in [left_eye_center, right_eye_center]:
            draw.line([cx-25, cy-25, cx+25, cy+25], fill=(255, 255, 255, 255), width=8)
            draw.line([cx-25, cy+25, cx+25, cy-25], fill=(255, 255, 255, 255), width=8)
    elif eye_trait == "Third Eye":
        # Normal eyes + third eye on forehead
        color = eye_colors.get(eye_trait.replace("Third Eye", "Crimson"), (220, 30, 30))
        for cx, cy in [left_eye_center, right_eye_center]:
            draw.ellipse([cx-eye_radius, cy-eye_radius, cx+eye_radius, cy+eye_radius], fill=color + (200,))
        # Third eye
        tx, ty = 512, 240
        draw.ellipse([tx-30, ty-30, tx+30, ty+30], fill=(180, 0, 255, 200))
        draw.ellipse([tx-12, ty-12, tx+12, ty+12], fill=(255, 255, 255, 200))
    elif eye_trait == "Hypnotic":
        # Swirl eyes
        for cx, cy in [left_eye_center, right_eye_center]:
            draw.ellipse([cx-eye_radius, cy-eye_radius, cx+eye_radius, cy+eye_radius], fill=(0, 200, 200, 200))
            for angle_offset in range(0, 360, 30):
                r_inner = eye_radius * 0.6
                x1 = cx + int(r_inner * math.cos(math.radians(angle_offset)))
                y1 = cy + int(r_inner * math.sin(math.radians(angle_offset)))
                x2 = cx + int(eye_radius * math.cos(math.radians(angle_offset + 20)))
                y2 = cy + int(eye_radius * math.sin(math.radians(angle_offset + 20)))
                draw.line([x1, y1, x2, y2], fill=(0, 100, 100, 180), width=3)
    else:
        # Default: solid color eyes
        color = eye_colors.get(eye_trait, (220, 30, 30))
        for cx, cy in [left_eye_center, right_eye_center]:
            draw.ellipse([cx-eye_radius, cy-eye_radius, cx+eye_radius, cy+eye_radius], fill=color + (200,))
            draw.ellipse([cx-12, cy-12, cx+12, cy+12], fill=(255, 255, 255, 180))
            draw.ellipse([cx-5, cy-5, cx+5, cy+5], fill=(0, 0, 0, 255))
    
    return img


def add_horns_overlay(base_img, horn_trait):
    """Draw horns on top of the base hound's head."""
    img = base_img.copy()
    draw = ImageDraw.Draw(img)
    
    # Horn positions based on actual anatomy
    head_top_y = 200
    left_x = 380
    right_x = 640
    center_x = 507
    
    horn_colors = {
        "Small Devil":   ((180, 30, 30), (220, 50, 50)),
        "Ram":           ((200, 180, 150), (160, 140, 110)),
        "Twisted":       ((150, 50, 180), (100, 20, 130)),
        "Flame":         ((255, 120, 0), (255, 200, 50)),
        "Bone":          ((220, 210, 190), (180, 170, 150)),
        "Crystal":       ((100, 150, 255), (180, 200, 255)),
        "Crown of Horns":((180, 30, 30), (220, 50, 50)),
        "Oni":           ((200, 30, 30), (255, 50, 50)),
        "Dragon":        ((80, 80, 80), (120, 120, 120)),
        "Halo of Fire":  ((255, 150, 0), (255, 220, 50)),
    }
    
    if horn_trait == "None":
        return img
    
    color1, color2 = horn_colors.get(horn_trait, ((180, 30, 30), (220, 50, 50)))
    
    if horn_trait == "Small Devil":
        # Two small pointed horns
        for x in [left_x, right_x]:
            draw.polygon([(x, head_top_y), (x - 15, head_top_y - 60), (x + 15, head_top_y)], fill=color1 + (220,))
            draw.polygon([(x, head_top_y), (x, head_top_y - 60), (x + 5, head_top_y - 50)], fill=color2 + (180,))
    
    elif horn_trait == "Ram":
        # Curved ram horns
        for x, direction in [(left_x, -1), (right_x, 1)]:
            for i in range(40):
                y = head_top_y - 10 - i
                r = 12 - i // 5
                cx = x + direction * (20 + int(15 * math.sin(i / 10)))
                draw.ellipse([cx - r, y - r, cx + r, y + r], fill=color1 + (200,))
    
    elif horn_trait == "Flame":
        # Horns made of fire
        for x in [left_x, right_x]:
            for i in range(8):
                h = 30 + i * 5
                w = 12 - i
                alpha = 220 - i * 20
                draw.ellipse([x - w, head_top_y - h - 10, x + w, head_top_y - h + 10], fill=(255, 120 + i*15, 0, max(alpha, 50)))
    
    elif horn_trait == "Halo of Fire":
        # Burning halo above head
        cx, cy = center_x, head_top_y - 30
        for r in range(60, 40, -2):
            alpha = int(180 * (1 - (r - 40) / 20))
            draw.ellipse([cx - r, cy - r//2, cx + r, cy + r//2], fill=(255, 150, 0, max(alpha, 30)))
        for angle in range(0, 360, 20):
            fx = cx + int(55 * math.cos(math.radians(angle)))
            fy = cy + int(25 * math.sin(math.radians(angle)))
            draw.ellipse([fx-6, fy-6, fx+6, fy+6], fill=(255, 220, 50, 150))
    
    elif horn_trait == "Oni":
        # Single horn from center
        draw.polygon([(center_x, head_top_y - 80), (center_x - 15, head_top_y), (center_x + 15, head_top_y)], fill=color1 + (220,))
        draw.polygon([(center_x, head_top_y - 80), (center_x, head_top_y), (center_x + 5, head_top_y - 20)], fill=color2 + (180,))
    
    else:
        # Generic: two pointed horns (works for Twisted, Bone, Crystal, Crown of Horns, Dragon)
        for x in [left_x, right_x]:
            height = 70 if horn_trait in ["Dragon", "Crown of Horns"] else 50
            draw.polygon([(x, head_top_y), (x - 18, head_top_y - height), (x + 18, head_top_y)], fill=color1 + (220,))
            draw.polygon([(x, head_top_y), (x + 5, head_top_y - height + 5), (x + 18, head_top_y)], fill=color2 + (180,))
        
        if horn_trait == "Crown of Horns":
            # Extra small horns around
            for i in range(5):
                angle = -60 + i * 30
                hx = center_x + int(120 * math.cos(math.radians(180 + angle)))
                hy = head_top_y - 10 + int(40 * math.sin(math.radians(angle)))
                draw.polygon([(hx, hy), (hx - 8, hy - 30), (hx + 8, hy)], fill=color1 + (180,))
    
    return img


def add_collar_overlay(base_img, collar_trait):
    """Draw collar around the hound's neck."""
    img = base_img.copy()
    draw = ImageDraw.Draw(img)
    
    # Neck area based on actual anatomy
    neck_y = 400
    neck_left = 330
    neck_right = 690
    center_x = 507
    
    if collar_trait == "None":
        return img
    
    if collar_trait == "Spiked":
        # Red spiked collar
        draw.rectangle([neck_left, neck_y - 15, neck_right, neck_y + 15], fill=(120, 20, 20, 220))
        draw.rectangle([neck_left + 3, neck_y - 12, neck_right - 3, neck_y + 12], fill=(160, 30, 30, 200))
        # Spikes
        for x in range(neck_left + 20, neck_right, 40):
            draw.polygon([(x, neck_y - 15), (x - 8, neck_y - 30), (x + 8, neck_y - 15)], fill=(200, 200, 200, 220))
    
    elif collar_trait == "Chains":
        # Chain links
        for x in range(neck_left, neck_right, 20):
            draw.ellipse([x, neck_y - 12, x + 16, neck_y + 12], outline=(150, 150, 150, 220), width=3)
    
    elif collar_trait == "Bone Tag":
        # Simple collar with bone tag
        draw.rectangle([neck_left, neck_y - 10, neck_right, neck_y + 10], fill=(60, 60, 60, 200))
        # Bone tag
        bx, by = center_x, neck_y + 20
        draw.ellipse([bx - 18, by - 8, bx - 8, by + 8], fill=(230, 230, 220, 230))
        draw.ellipse([bx + 8, by - 8, bx + 18, by + 8], fill=(230, 230, 220, 230))
        draw.rectangle([bx - 12, by - 5, bx + 12, by + 5], fill=(230, 230, 220, 230))
    
    elif collar_trait == "Skull Tag":
        draw.rectangle([neck_left, neck_y - 10, neck_right, neck_y + 10], fill=(60, 60, 60, 200))
        # Skull
        sx, sy = center_x, neck_y + 22
        draw.ellipse([sx - 14, sy - 14, sx + 14, sy + 10], fill=(230, 230, 220, 230))
        draw.ellipse([sx - 6, sy - 6, sx - 2, sy - 2], fill=(0, 0, 0, 200))
        draw.ellipse([sx + 2, sy - 6, sx + 6, sy - 2], fill=(0, 0, 0, 200))
    
    elif collar_trait == "Lava Drip":
        # Glowing lava collar with drips
        draw.rectangle([neck_left, neck_y - 12, neck_right, neck_y + 12], fill=(255, 100, 0, 200))
        for x in range(neck_left + 30, neck_right, 50):
            drip_len = 20 + (x * 7 % 15)
            draw.polygon([(x - 6, neck_y + 12), (x + 6, neck_y + 12), (x, neck_y + 12 + drip_len)], fill=(255, 150, 0, 180))
    
    elif collar_trait == "Soul Chain":
        # Ethereal chain with glowing orbs
        for x in range(neck_left, neck_right, 25):
            draw.ellipse([x, neck_y - 10, x + 14, neck_y + 10], outline=(100, 150, 255, 180), width=2)
        for x in [neck_left + 60, center_x, neck_right - 60]:
            draw.ellipse([x - 10, neck_y - 10, x + 10, neck_y + 10], fill=(150, 200, 255, 150))
    
    elif collar_trait == "Barbed Wire":
        draw.line([(neck_left, neck_y), (neck_right, neck_y)], fill=(120, 120, 120, 220), width=4)
        for x in range(neck_left + 15, neck_right, 25):
            draw.line([(x, neck_y - 8), (x + 10, neck_y + 8)], fill=(150, 150, 150, 200), width=2)
    
    elif collar_trait == "Demon Bell":
        draw.rectangle([neck_left, neck_y - 10, neck_right, neck_y + 10], fill=(80, 20, 20, 200))
        # Bell
        bx, by = center_x, neck_y + 25
        draw.polygon([(bx - 12, by), (bx + 12, by), (bx, by - 15)], fill=(200, 150, 0, 220))
        draw.ellipse([bx - 5, by - 2, bx + 5, by + 8], fill=(180, 130, 0, 200))
    
    elif collar_trait == "Ribcage":
        # Ribs around neck
        for i in range(5):
            x = neck_left + 30 + i * 65
            draw.arc([x - 25, neck_y - 25, x + 25, neck_y + 25], 180, 360, fill=(220, 210, 190, 200), width=4)
    
    elif collar_trait == "Royal":
        # Gold collar with gems
        draw.rectangle([neck_left, neck_y - 12, neck_right, neck_y + 12], fill=(200, 170, 0, 220))
        draw.rectangle([neck_left + 3, neck_y - 9, neck_right - 3, neck_y + 9], fill=(255, 215, 0, 200))
        for x in [neck_left + 60, center_x, neck_right - 60]:
            draw.ellipse([x - 8, neck_y - 8, x + 8, neck_y + 8], fill=(200, 0, 0, 230))
    
    return img


def add_special_overlay(base_img, special_trait):
    """Draw special features on the hound."""
    img = base_img.copy()
    draw = ImageDraw.Draw(img)
    
    center_x = 507
    body_y = 570
    
    if special_trait == "None":
        return img
    
    if special_trait == "Bat Wings":
        # Small bat wings on back sides
        for direction in [-1, 1]:
            wx = center_x + direction * 180
            wy = body_y - 30
            # Wing shape
            draw.polygon([
                (wx, wy),
                (wx + direction * 100, wy - 60),
                (wx + direction * 120, wy - 20),
                (wx + direction * 100, wy),
                (wx + direction * 80, wy - 10),
                (wx + direction * 60, wy),
            ], fill=(60, 20, 20, 200), outline=(40, 10, 10, 220))
    
    elif special_trait == "Skeleton Wings":
        for direction in [-1, 1]:
            wx = center_x + direction * 170
            wy = body_y - 40
            # Bone frame
            draw.line([(wx, wy), (wx + direction * 110, wy - 70)], fill=(220, 210, 190, 220), width=4)
            draw.line([(wx, wy), (wx + direction * 100, wy - 20)], fill=(220, 210, 190, 220), width=3)
            for i in range(5):
                t = 0.2 + i * 0.15
                bx = wx + int(direction * 110 * t)
                by = wy - int(70 * t)
                draw.line([(bx, by), (bx + direction * 30, by + 10)], fill=(220, 210, 190, 180), width=2)
    
    elif special_trait == "Fire Breath":
        # Fire coming from mouth
        mx, my = center_x, 430
        for i in range(6):
            r = 15 + i * 5
            alpha = 200 - i * 25
            draw.ellipse([mx - r, my - r//2, mx + r, my + r//2], fill=(255, 120 + i*20, 0, max(alpha, 30)))
    
    elif special_trait == "Pitchfork":
        # Small pitchfork in front paw area
        px, py = 620, 700
        draw.line([(px, py), (px, py - 80)], fill=(150, 150, 150, 220), width=4)
        draw.line([(px - 15, py - 80), (px + 15, py - 80)], fill=(150, 150, 150, 220), width=3)
        for dx in [-15, 0, 15]:
            draw.line([(px + dx, py - 80), (px + dx, py - 100)], fill=(200, 50, 50, 200), width=3)
    
    elif special_trait == "Shadow Aura":
        # Dark aura around body
        for r in range(80, 0, -3):
            alpha = int(40 * (1 - r / 80))
            draw.ellipse([center_x - 200 - r, body_y - 150 - r//2, center_x + 200 + r, body_y + 100 + r//2],
                        fill=(30, 0, 50, alpha))
    
    elif special_trait == "Demon Sword":
        px, py = 640, 680
        draw.line([(px, py), (px, py - 90)], fill=(180, 180, 180, 220), width=4)
        draw.polygon([(px - 8, py - 90), (px + 8, py - 90), (px, py - 120)], fill=(200, 30, 30, 220))
        draw.rectangle([px - 15, py - 5, px + 15, py + 5], fill=(200, 170, 0, 200))
    
    elif special_trait == "Flame Crown":
        cy = 175
        for x in range(center_x - 50, center_x + 50, 20):
            h = 25 + (x * 7 % 15)
            draw.polygon([(x, cy), (x - 8, cy - h), (x + 8, cy)], fill=(255, 150, 0, 200))
            draw.polygon([(x, cy), (x, cy - h + 5), (x + 3, cy - h + 10)], fill=(255, 220, 50, 160))
    
    elif special_trait == "Angel Wings":
        for direction in [-1, 1]:
            wx = center_x + direction * 200
            wy = body_y - 60
            for i in range(8):
                t = i / 8
                fx = wx + direction * int(80 * (1 - t))
                fy = wy - int(60 * t) + int(40 * t * t)
                draw.ellipse([fx - 15, fy - 8, fx + 15, fy + 8], fill=(240, 240, 250, 160))
    
    elif special_trait == "Trident":
        px, py = 640, 700
        draw.line([(px, py), (px, py - 100)], fill=(200, 170, 0, 220), width=4)
        for dx in [-12, 0, 12]:
            draw.line([(px + dx, py - 100), (px + dx, py - 130)], fill=(200, 170, 0, 200), width=3)
        draw.line([(px - 12, py - 115), (px + 12, py - 115)], fill=(200, 170, 0, 200), width=2)
    
    elif special_trait == "Chaos Orb":
        ox, oy = 700, 500
        for r in range(40, 0, -3):
            alpha = int(150 * (1 - r / 40))
            hue = (r * 5) % 360
            import colorsys
            rgb = colorsys.hsv_to_rgb(hue / 360, 0.8, 0.9)
            draw.ellipse([ox - r, oy - r, ox + r, oy + r], fill=(int(rgb[0]*255), int(rgb[1]*255), int(rgb[2]*255), alpha))
    
    elif special_trait == "Doom Scroll":
        px, py = 650, 680
        draw.rectangle([px - 10, py - 50, px + 10, py + 10], fill=(180, 160, 100, 200))
        draw.ellipse([px - 12, py - 55, px + 12, py - 45], fill=(160, 140, 80, 200))
        draw.ellipse([px - 12, py + 5, px + 12, py + 15], fill=(160, 140, 80, 200))
    
    elif special_trait == "Hell Guitar":
        gx, gy = 660, 650
        draw.ellipse([gx - 20, gy - 10, gx + 20, gy + 30], fill=(200, 30, 0, 200))
        draw.ellipse([gx - 15, gy - 25, gx + 15, gy + 5], fill=(180, 20, 0, 200))
        draw.line([(gx, gy - 25), (gx, gy - 80)], fill=(200, 30, 0, 220), width=3)
        draw.line([(gx - 15, gy - 80), (gx + 15, gy - 80)], fill=(200, 170, 0, 200), width=2)
    
    elif special_trait == "Skull Shield":
        px, py = 650, 680
        draw.ellipse([px - 30, py - 35, px + 30, py + 25], fill=(100, 100, 100, 180), outline=(70, 70, 70, 200), width=3)
        # Skull on shield
        draw.ellipse([px - 12, py - 18, px + 12, py + 2], fill=(220, 210, 190, 200))
        draw.ellipse([px - 5, py - 12, px - 1, py - 6], fill=(0, 0, 0, 200))
        draw.ellipse([px + 1, py - 12, px + 5, py - 6], fill=(0, 0, 0, 200))
    
    return img


def add_tail_effect(base_img, tail_trait):
    """Add tail visual effect behind/around the hound."""
    img = base_img.copy()
    draw = ImageDraw.Draw(img)
    
    # Tail area (behind body, lower right)
    tail_x = 660
    tail_y = 700
    
    if tail_trait == "Fire":
        for i in range(5):
            r = 20 - i * 3
            draw.ellipse([tail_x - r, tail_y - r - i*15, tail_x + r, tail_y + r - i*15],
                        fill=(255, 120 + i*30, 0, 200 - i*30))
    
    elif tail_trait == "Chain":
        draw.line([(tail_x, tail_y), (tail_x + 40, tail_y - 60)], fill=(150, 150, 150, 200), width=4)
        draw.ellipse([tail_x + 30, tail_y - 75, tail_x + 55, tail_y - 50], fill=(120, 120, 120, 180))
    
    elif tail_trait == "Bone":
        draw.line([(tail_x, tail_y), (tail_x + 30, tail_y - 50)], fill=(220, 210, 190, 200), width=5)
        for dx, dy in [(tail_x + 30, tail_y - 50), (tail_x + 15, tail_y - 25)]:
            draw.ellipse([dx - 6, dy - 4, dx + 6, dy + 4], fill=(230, 220, 200, 200))
    
    elif tail_trait == "Demon":
        # Classic arrow-tip demon tail
        draw.line([(tail_x, tail_y), (tail_x + 50, tail_y - 70)], fill=(40, 10, 10, 200), width=4)
        ax, ay = tail_x + 50, tail_y - 70
        draw.polygon([(ax, ay), (ax + 15, ay - 10), (ax + 5, ay + 15)], fill=(200, 30, 30, 200))
    
    elif tail_trait == "Ghost":
        for i in range(4):
            r = 12 - i * 2
            alpha = 150 - i * 30
            offset = i * 12
            draw.ellipse([tail_x - r + offset, tail_y - r - i*10, tail_x + r + offset, tail_y + r - i*10],
                        fill=(200, 220, 255, max(alpha, 30)))
    
    else:
        # Generic colored tail effect for other traits
        tail_colors = {
            "Serpent": (0, 180, 0),
            "Lava Whip": (255, 140, 0),
            "Scorpion": (120, 80, 0),
            "Abyssal Tentacle": (80, 0, 120),
            "Multi-Flame": (255, 100, 0),
            "Soul Eater": (100, 0, 150),
        }
        color = tail_colors.get(tail_trait, (255, 100, 0))
        draw.line([(tail_x, tail_y), (tail_x + 40, tail_y - 60)], fill=color + (200,), width=4)
        draw.ellipse([tail_x + 30, tail_y - 70, tail_x + 55, tail_y - 45], fill=color + (180,))
    
    return img


# ============================================================
# MAIN COMPOSITION FUNCTION
# ============================================================

def compose_nft(traits, base_hound_rgba, output_path):
    """Compose a complete NFT from traits.
    
    Layers (bottom to top):
    1. Background
    2. Tail effect (behind hound)
    3. Recolored base hound
    4. Eyes overlay
    5. Collar overlay
    6. Horns overlay
    7. Special overlay
    """
    # 1. Background
    bg = create_background(traits.get("background", "Void"))
    
    # 2. Tail (behind body)
    bg = add_tail_effect(bg, traits.get("tail", "Fire"))
    
    # 3. Recolored base hound
    hound = recolor_fur(base_hound_rgba, traits.get("fur", "Shadow Black"))
    
    # Handle alpha for Ghost fur
    if traits.get("fur") == "Ghost":
        hound = hound.copy()
    
    # Composite hound onto background
    bg.paste(hound, (0, 0), hound)
    
    # 4. Eyes
    result = add_eyes_overlay(bg, traits.get("eyes", "Crimson"))
    
    # 5. Collar
    result = add_collar_overlay(result, traits.get("collar", "Spiked"))
    
    # 6. Horns
    result = add_horns_overlay(result, traits.get("horns", "Small Devil"))
    
    # 7. Special
    result = add_special_overlay(result, traits.get("special", "None"))
    
    # Save
    result.save(output_path, "PNG")
    return result


# ============================================================
# TEST / SAMPLE GENERATION
# ============================================================

if __name__ == "__main__":
    print("🔥 HOUNDS OF HELL — Compositing Engine Test")
    print("=" * 50)
    
    # Load the clean base hound (already extracted)
    clean_base_path = "/home/z/my-project/nft-system/base_bare_clean.png"
    print(f"\n📸 Loading clean base hound from: {clean_base_path}")
    
    base_rgba = Image.open(clean_base_path).convert("RGBA")
    
    # Save for review
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Generate one test NFT with Shadow Black fur
    test_traits = {
        "background": "Inferno",
        "fur": "Shadow Black",
        "eyes": "Crimson",
        "horns": "Small Devil",
        "collar": "Spiked",
        "tail": "Fire",
        "special": "None"
    }
    
    print(f"\n🐺 Generating test NFT...")
    print(f"   Traits: {test_traits}")
    
    result = compose_nft(test_traits, base_rgba, os.path.join(OUTPUT_DIR, "test_composite.png"))
    print(f"✅ Test composite saved to: {OUTPUT_DIR}/test_composite.png")
    
    # Generate samples from each tier
    with open(os.path.join(BASE_DIR, "all_nfts.json")) as f:
        all_nfts = json.load(f)
    
    sample_count = 0
    for nft in all_nfts[:20]:
        sample_count += 1
        out_path = os.path.join(OUTPUT_DIR, f"hound_{nft['tokenId']:03d}_{nft['rarityTier'].lower()}.png")
        compose_nft(nft["traits"], base_rgba, out_path)
        if sample_count <= 5:
            print(f"   #{nft['tokenId']:03d} [{nft['rarityTier']}] → {os.path.basename(out_path)}")
    
    print(f"\n🎉 Generated {sample_count} sample composites!")
    print(f"   Output: {OUTPUT_DIR}/")
