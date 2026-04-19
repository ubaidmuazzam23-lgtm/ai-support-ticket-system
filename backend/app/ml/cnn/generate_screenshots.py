# File: backend/app/ml/cnn/generate_screenshots.py
#
# Generates synthetic IT error screenshots for CNN training.
# 25 error classes × 200 images = 5000 total training images.
#
# Run: PYTHONPATH=. python3 app/ml/cnn/generate_screenshots.py

import os
import random
import math
from PIL import Image, ImageDraw, ImageFont

BASE_DIR    = os.path.dirname(__file__)
OUTPUT_DIR  = os.path.join(BASE_DIR, "data", "screenshots")
IMG_SIZE    = (1280, 720)
IMAGES_PER_CLASS = 200

# ── Error classes ─────────────────────────────────────────────────────────────
CLASSES = [
    "bsod",
    "memory_error",
    "cpu_high",
    "disk_full",
    "hardware_failure",
    "dns_error",
    "network_unreachable",
    "vpn_error",
    "ssl_error",
    "timeout",
    "permission_denied",
    "login_failed",
    "mfa_error",
    "session_expired",
    "app_crash",
    "update_error",
    "install_error",
    "dependency_error",
    "db_connection_error",
    "db_query_error",
    "db_timeout",
    "cloud_auth_error",
    "deployment_error",
    "container_error",
    "general_error",
]

# ── Color themes ──────────────────────────────────────────────────────────────
THEMES = {
    "windows_light": {"bg": (240, 240, 240), "window": (255, 255, 255), "text": (0, 0, 0),    "border": (180, 180, 180), "btn": (225, 225, 225), "btn_text": (0, 0, 0),    "accent": (0, 120, 215)},
    "windows_dark":  {"bg": (32, 32, 32),    "window": (45, 45, 48),   "text": (255, 255, 255), "border": (70, 70, 70),   "btn": (60, 60, 60),   "btn_text": (255, 255, 255), "accent": (0, 120, 215)},
    "mac_light":     {"bg": (236, 236, 236),  "window": (255, 255, 255), "text": (0, 0, 0),    "border": (200, 200, 200), "btn": (245, 245, 245), "btn_text": (0, 0, 0),    "accent": (0, 122, 255)},
    "mac_dark":      {"bg": (30, 30, 30),     "window": (44, 44, 46),   "text": (255, 255, 255), "border": (60, 60, 60),   "btn": (58, 58, 60),   "btn_text": (255, 255, 255), "accent": (10, 132, 255)},
    "linux":         {"bg": (50, 50, 50),     "window": (60, 63, 65),   "text": (187, 187, 187), "border": (80, 80, 80),   "btn": (75, 75, 75),   "btn_text": (200, 200, 200), "accent": (255, 140, 0)},
}

ERROR_COLORS = {
    "critical": (220, 50, 47),
    "warning":  (255, 165, 0),
    "info":     (0, 120, 215),
    "success":  (0, 180, 0),
}


def get_font(size: int):
    """Try to get a system font, fall back to default."""
    font_paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except:
                pass
    return ImageFont.load_default()


def draw_window(draw, x, y, w, h, theme, title="", icon_color=None):
    """Draw a window frame."""
    t = THEMES[theme]
    # Shadow
    draw.rectangle([x+4, y+4, x+w+4, y+h+4], fill=(0, 0, 0, 40) if "dark" in theme else (180, 180, 180))
    # Window body
    draw.rectangle([x, y, x+w, y+h], fill=t["window"], outline=t["border"], width=1)
    # Title bar
    bar_h = 36
    draw.rectangle([x, y, x+w, y+bar_h], fill=t["accent"] if icon_color else t["border"])
    if title:
        font = get_font(13)
        draw.text((x+12, y+10), title, font=font, fill=(255, 255, 255) if icon_color else t["text"])
    # Window controls (circles for Mac, X for Windows)
    if "mac" in theme:
        for i, color in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
            draw.ellipse([x+8+i*20, y+10, x+20+i*20, y+22], fill=color)
    else:
        for i, char in enumerate(["─", "□", "✕"]):
            cx = x + w - 42 + i*14
            draw.text((cx, y+10), char, font=get_font(11), fill=(255, 255, 255))


def draw_button(draw, x, y, w, h, text, theme, primary=False):
    t = THEMES[theme]
    color = t["accent"] if primary else t["btn"]
    text_color = (255, 255, 255) if primary else t["btn_text"]
    draw.rectangle([x, y, x+w, y+h], fill=color, outline=t["border"], width=1)
    font = get_font(12)
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    draw.text((x + (w-tw)//2, y + (h-12)//2), text, font=font, fill=text_color)


def draw_icon(draw, x, y, size, icon_type):
    """Draw error/warning/info icon."""
    if icon_type == "error":
        draw.ellipse([x, y, x+size, y+size], fill=(220, 50, 47), outline=(180, 30, 30), width=2)
        font = get_font(size//2)
        draw.text((x+size//4, y+size//8), "✕", font=font, fill=(255, 255, 255))
    elif icon_type == "warning":
        # Triangle
        pts = [(x+size//2, y), (x, y+size), (x+size, y+size)]
        draw.polygon(pts, fill=(255, 165, 0), outline=(200, 130, 0))
        font = get_font(size//2)
        draw.text((x+size//3, y+size//3), "!", font=font, fill=(255, 255, 255))
    elif icon_type == "info":
        draw.ellipse([x, y, x+size, y+size], fill=(0, 120, 215), outline=(0, 90, 180), width=2)
        font = get_font(size//2)
        draw.text((x+size//3, y+size//8), "i", font=font, fill=(255, 255, 255))
    elif icon_type == "shield":
        draw.polygon([(x+size//2, y), (x+size, y+size//3), (x+size, y+size*2//3), (x+size//2, y+size), (x, y+size*2//3), (x, y+size//3)], fill=(220, 50, 47))
        font = get_font(size//2)
        draw.text((x+size//3, y+size//4), "!", font=font, fill=(255, 255, 255))


def add_noise(img, amount=0.02):
    """Add slight random noise for realism."""
    import random
    pixels = img.load()
    w, h = img.size
    num_pixels = int(w * h * amount)
    for _ in range(num_pixels):
        x = random.randint(0, w-1)
        y = random.randint(0, h-1)
        v = random.randint(0, 255)
        try:
            pixels[x, y] = (v, v, v)
        except:
            pass
    return img


# ── Screenshot generators per class ──────────────────────────────────────────

def gen_bsod(variant: int) -> Image.Image:
    img  = Image.new("RGB", IMG_SIZE, (0, 0, 200) if variant % 3 != 0 else (0, 0, 128))
    draw = ImageDraw.Draw(img)
    draw.text((80, 80), ":(" , font=get_font(120), fill=(255, 255, 255))
    draw.text((80, 220), "Your PC ran into a problem and needs to restart.", font=get_font(22), fill=(255, 255, 255))
    draw.text((80, 270), "We're just collecting some error info, and then we'll restart for you.", font=get_font(16), fill=(200, 200, 255))
    pct = random.randint(0, 100)
    draw.text((80, 340), f"{pct}% complete", font=get_font(20), fill=(255, 255, 255))
    codes = ["MEMORY_MANAGEMENT", "PAGE_FAULT_IN_NONPAGED_AREA", "SYSTEM_SERVICE_EXCEPTION",
             "KERNEL_SECURITY_CHECK_FAILURE", "CRITICAL_PROCESS_DIED", "IRQL_NOT_LESS_OR_EQUAL",
             "BAD_POOL_HEADER", "NTFS_FILE_SYSTEM", "DPC_WATCHDOG_VIOLATION"]
    draw.text((80, 420), f"Stop code: {random.choice(codes)}", font=get_font(16), fill=(255, 255, 255))
    qr_size = 120
    draw.rectangle([80, 520, 80+qr_size, 520+qr_size], outline=(255, 255, 255), width=2)
    draw.text((220, 530), "For more information about this issue", font=get_font(13), fill=(200, 200, 255))
    draw.text((220, 555), "and possible fixes, visit", font=get_font(13), fill=(200, 200, 255))
    draw.text((220, 580), "https://www.windows.com/stopcode", font=get_font(13), fill=(150, 200, 255))
    return img


def gen_memory_error(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    wx, wy, ww, wh = 200, 150, 880, 420
    draw_window(draw, wx, wy, ww, wh, theme, "System Error", icon_color=True)
    draw_icon(draw, wx+40, wy+80, 60, "error")
    messages = [
        ("Out of Memory", "The system has run out of virtual memory.\nYour program or one of its components can no longer continue\nto function correctly because of insufficient memory."),
        ("Java Heap Space", "Exception in thread 'main' java.lang.OutOfMemoryError: Java heap space\n\tat com.application.Main.processData(Main.java:142)\n\tat com.application.Main.run(Main.java:87)"),
        ("Memory Allocation Failed", "malloc(): memory corruption\nAborted (core dumped)\n\nFailed to allocate 8589934592 bytes"),
    ]
    title, msg = random.choice(messages)
    draw.text((wx+120, wy+85), title, font=get_font(18), fill=ERROR_COLORS["critical"])
    y = wy + 120
    for line in msg.split('\n'):
        draw.text((wx+120, y), line, font=get_font(13), fill=t["text"])
        y += 20
    draw_button(draw, wx+ww-220, wy+wh-60, 90, 32, "OK", theme, primary=True)
    draw_button(draw, wx+ww-320, wy+wh-60, 90, 32, "Details", theme)
    return img


def gen_cpu_high(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    # Task Manager style
    wx, wy, ww, wh = 100, 50, 1080, 620
    draw_window(draw, wx, wy, ww, wh, theme, "Task Manager")
    tabs = ["Processes", "Performance", "App history", "Startup", "Users", "Details", "Services"]
    tx = wx + 10
    for tab in tabs:
        w = len(tab) * 8 + 20
        draw.rectangle([tx, wy+36, tx+w, wy+60], fill=t["accent"] if tab == "Performance" else t["bg"])
        draw.text((tx+8, wy+42), tab, font=get_font(12), fill=(255,255,255) if tab == "Performance" else t["text"])
        tx += w + 2
    # CPU usage bar
    cpu_pct = random.randint(85, 99)
    draw.text((wx+20, wy+80), "CPU", font=get_font(18), fill=t["text"])
    draw.text((wx+20, wy+105), f"Intel Core i7  {cpu_pct}%  3.2 GHz", font=get_font(13), fill=t["textMuted"] if "textMuted" in t else t["text"])
    bar_x, bar_y, bar_w, bar_h = wx+20, wy+130, 500, 200
    draw.rectangle([bar_x, bar_y, bar_x+bar_w, bar_y+bar_h], fill=(20, 20, 20), outline=t["border"])
    # Draw CPU graph
    points = []
    for i in range(50):
        x = bar_x + i * (bar_w // 50)
        pct = random.randint(80, 99) / 100
        y = bar_y + bar_h - int(bar_h * pct)
        points.append((x, y))
    for i in range(len(points)-1):
        draw.line([points[i], points[i+1]], fill=(0, 200, 0), width=2)
    draw.text((bar_x, bar_y+bar_h+10), f"{cpu_pct}%", font=get_font(32), fill=(0, 200, 0))
    return img


def gen_disk_full(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    wx, wy, ww, wh = 250, 180, 780, 360
    draw_window(draw, wx, wy, ww, wh, theme, "Low Disk Space", icon_color=True)
    draw_icon(draw, wx+40, wy+80, 55, "warning")
    msgs = [
        ("Low Disk Space", "You are running out of disk space on Local Disk (C:).\nTo free up space on this drive, click here..."),
        ("Disk Full", "Cannot complete the operation because the disk is full.\nFree up disk space and try again."),
        ("No Space Left on Device", "cp: error writing '/var/log/syslog': No space left on device\ndf -h shows / is at 100% usage"),
    ]
    title, msg = random.choice(msgs)
    draw.text((wx+110, wy+80), title, font=get_font(17), fill=ERROR_COLORS["warning"])
    y = wy + 110
    for line in msg.split('\n'):
        draw.text((wx+110, y), line, font=get_font(13), fill=t["text"])
        y += 20
    # Disk usage bar
    bar_x, bar_y = wx+40, wy+200
    draw.rectangle([bar_x, bar_y, bar_x+700, bar_y+20], fill=(60,60,60), outline=t["border"])
    pct = random.randint(95, 100)
    draw.rectangle([bar_x, bar_y, bar_x+int(700*pct/100), bar_y+20], fill=(220, 50, 47))
    draw.text((bar_x, bar_y+28), f"499 GB used of 500 GB ({pct}%)", font=get_font(12), fill=t["text"])
    draw_button(draw, wx+ww-230, wy+wh-60, 180, 32, "Free up space", theme, primary=True)
    draw_button(draw, wx+ww-330, wy+wh-60, 90, 32, "Close", theme)
    return img


def gen_hardware_failure(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    wx, wy, ww, wh = 200, 150, 880, 420
    draw_window(draw, wx, wy, ww, wh, theme, "Device Manager - Error")
    draw_icon(draw, wx+40, wy+80, 55, "error")
    errors = [
        ("Device Not Recognized", "USB Device Not Recognized\nOne of the USB devices attached to this computer has malfunctioned,\nand Windows does not recognize it."),
        ("Driver Error", "This device cannot start. (Code 10)\nA request for the USB device descriptor failed.\nDriver: Unknown Device\nStatus: 0xC00000B5"),
        ("Hardware Malfunction", "A fatal hardware error has occurred.\nComponent: Memory\nError Source: Machine Check Exception\nError Type: Bus/Interconnect Error"),
    ]
    title, msg = random.choice(errors)
    draw.text((wx+110, wy+80), title, font=get_font(17), fill=ERROR_COLORS["critical"])
    y = wy + 115
    for line in msg.split('\n'):
        draw.text((wx+110, y), line, font=get_font(13), fill=t["text"])
        y += 20
    draw_button(draw, wx+ww-120, wy+wh-60, 90, 32, "OK", theme, primary=True)
    return img


def gen_dns_error(variant: int) -> Image.Image:
    # Browser DNS error page
    browsers = ["chrome", "firefox", "edge"]
    browser  = random.choice(browsers)
    bg_color = (255, 255, 255) if variant % 2 == 0 else (32, 33, 36)
    text_col = (32, 33, 36) if variant % 2 == 0 else (232, 234, 237)
    muted    = (128, 128, 128)
    img  = Image.new("RGB", IMG_SIZE, bg_color)
    draw = ImageDraw.Draw(img)
    # Browser chrome
    draw.rectangle([0, 0, IMG_SIZE[0], 80], fill=(240, 240, 240) if variant % 2 == 0 else (50, 50, 50))
    urls = ["https://internal.company.com", "https://erp.acme.corp", "https://mail.company.org"]
    draw.rectangle([100, 15, 900, 55], fill=(255,255,255) if variant%2==0 else (60,60,60), outline=muted, width=1)
    draw.text((115, 25), random.choice(urls), font=get_font(14), fill=muted)
    # Error content
    draw.text((100, 140), "This site can't be reached", font=get_font(32), fill=text_col)
    domain = random.choice(["internal.company.com", "erp.acme.corp", "mail.company.org"])
    errors = [
        f"{domain}'s server DNS address could not be found.",
        f"DNS_PROBE_FINISHED_NXDOMAIN",
        f"ERR_NAME_NOT_RESOLVED",
    ]
    draw.text((100, 195), random.choice(errors), font=get_font(16), fill=muted)
    draw.text((100, 260), "Try:", font=get_font(14), fill=text_col)
    suggestions = ["• Checking the connection", "• Checking the proxy and the firewall", "• Running Windows Network Diagnostics", f"• DNS_PROBE_FINISHED_NXDOMAIN"]
    y = 285
    for s in suggestions:
        draw.text((115, y), s, font=get_font(13), fill=muted)
        y += 24
    # Reload button
    draw.rectangle([100, y+20, 220, y+52], fill=(26, 115, 232) if variant%2==0 else (138, 180, 248), outline=(0,0,0,0))
    draw.text((115, y+30), "Reload", font=get_font(14), fill=(255,255,255))
    return img


def gen_network_unreachable(variant: int) -> Image.Image:
    bg = (255,255,255) if variant%2==0 else (32,33,36)
    tc = (32,33,36) if variant%2==0 else (232,234,237)
    img  = Image.new("RGB", IMG_SIZE, bg)
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, IMG_SIZE[0], 80], fill=(240,240,240) if variant%2==0 else (50,50,50))
    draw.text((100, 130), "No internet", font=get_font(36), fill=tc)
    errs = ["ERR_INTERNET_DISCONNECTED", "ERR_NETWORK_CHANGED", "ERR_CONNECTION_REFUSED", "ERR_CONNECTION_TIMED_OUT"]
    draw.text((100, 185), random.choice(errs), font=get_font(16), fill=(128,128,128))
    draw.text((100, 240), "Try:", font=get_font(14), fill=tc)
    tips = ["• Checking the network cables, modem, and router", "• Reconnecting to Wi-Fi", "• Running Windows Network Diagnostics"]
    y = 265
    for tip in tips:
        draw.text((115, y), tip, font=get_font(13), fill=(128,128,128))
        y += 24
    return img


def gen_vpn_error(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    wx, wy, ww, wh = 250, 160, 780, 400
    draw_window(draw, wx, wy, ww, wh, theme, "VPN Connection Error", icon_color=True)
    draw_icon(draw, wx+40, wy+80, 55, "error")
    errors = [
        ("VPN Connection Failed", "The remote connection was not made because the attempted\nVPN tunnels failed. Please contact your administrator.\n\nError Code: 789 — L2TP connection failed"),
        ("Authentication Failed", "VPN Authentication failed.\nThe credentials you provided are not valid.\nPlease check your username and password.\n\nError: 691"),
        ("Network Policy Server", "A connection between your computer and the VPN server\nhas been started, but the VPN connection cannot be completed.\n\nError 812: Connection prevented due to policy"),
    ]
    title, msg = random.choice(errors)
    draw.text((wx+110, wy+80), title, font=get_font(17), fill=ERROR_COLORS["critical"])
    y = wy + 115
    for line in msg.split('\n'):
        draw.text((wx+110, y), line, font=get_font(13), fill=t["text"])
        y += 20
    draw_button(draw, wx+ww-230, wy+wh-60, 110, 32, "Reconnect", theme, primary=True)
    draw_button(draw, wx+ww-330, wy+wh-60, 90, 32, "Close", theme)
    return img


def gen_ssl_error(variant: int) -> Image.Image:
    bg = (255,255,255) if variant%2==0 else (32,33,36)
    tc = (32,33,36) if variant%2==0 else (232,234,237)
    img  = Image.new("RGB", IMG_SIZE, bg)
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, IMG_SIZE[0], 80], fill=(240,240,240) if variant%2==0 else (50,50,50))
    # Warning banner
    draw.rectangle([0, 80, IMG_SIZE[0], 160], fill=(255, 245, 230) if variant%2==0 else (80, 50, 0))
    draw.text((50, 100), "⚠  Your connection is not private", font=get_font(28), fill=(180, 100, 0))
    draw.text((50, 175), "Attackers might be trying to steal your information from", font=get_font(15), fill=tc)
    domain = random.choice(["erp.company.com", "internal.acme.org", "mail.corp.net"])
    draw.text((50, 198), f"{domain} (for example, passwords, messages, or credit cards).", font=get_font(15), fill=tc)
    errs = ["NET::ERR_CERT_AUTHORITY_INVALID", "NET::ERR_CERT_DATE_INVALID", "NET::ERR_CERT_COMMON_NAME_INVALID", "NET::ERR_CERT_REVOKED"]
    draw.text((50, 240), random.choice(errs), font=get_font(14), fill=(128,128,128))
    draw.rectangle([50, 290, 270, 330], fill=(26,115,232) if variant%2==0 else (138,180,248))
    draw.text((65, 303), "Back to safety", font=get_font(14), fill=(255,255,255))
    draw.text((50, 360), "Advanced", font=get_font(14), fill=(26,115,232))
    return img


def gen_timeout(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    errs  = [
        ("Request Timeout", "The server at erp.company.com is taking too long to respond.\nError code: ERR_CONNECTION_TIMED_OUT"),
        ("Gateway Timeout", "504 Gateway Timeout\nThe server didn't respond in time.\nnginx/1.18.0"),
        ("Connection Timed Out", "SSH connection to 10.0.1.45 timed out.\nssh: connect to host 10.0.1.45 port 22: Operation timed out"),
    ]
    bg2 = (255,255,255) if "light" in theme else (32,33,36)
    img2 = Image.new("RGB", IMG_SIZE, bg2)
    draw2= ImageDraw.Draw(img2)
    title, msg = random.choice(errs)
    draw2.text((100, 140), title, font=get_font(32), fill=(32,33,36) if "light" in theme else (232,234,237))
    y = 200
    for line in msg.split('\n'):
        draw2.text((100, y), line, font=get_font(15), fill=(128,128,128))
        y += 28
    return img2


def gen_permission_denied(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    wx, wy, ww, wh = 250, 180, 780, 360
    draw_window(draw, wx, wy, ww, wh, theme, "Access Denied", icon_color=True)
    draw_icon(draw, wx+40, wy+80, 55, "shield")
    msgs = [
        ("You don't have permission to access this folder.",  "You'll need to provide administrator permission\nto access this folder. Continue?"),
        ("Access is denied.",                                  "Error 0x80070005: Access is denied.\nD:\\System32\\config\\SAM"),
        ("Permission denied",                                  "$ sudo cat /etc/shadow\n[sudo] password for user:\nPermission denied"),
    ]
    title, msg = random.choice(msgs)
    draw.text((wx+110, wy+80), title, font=get_font(16), fill=ERROR_COLORS["critical"])
    y = wy + 115
    for line in msg.split('\n'):
        draw.text((wx+110, y), line, font=get_font(13), fill=t["text"])
        y += 20
    draw_button(draw, wx+ww-230, wy+wh-60, 100, 32, "Continue", theme, primary=True)
    draw_button(draw, wx+ww-330, wy+wh-60, 90, 32, "Cancel", theme)
    return img


def gen_login_failed(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    wx, wy, ww, wh = 340, 160, 600, 400
    draw_window(draw, wx, wy, ww, wh, theme, "Sign In")
    # Login form
    draw.text((wx+30, wy+60), "Username", font=get_font(12), fill=t["textMuted"] if "textMuted" in t else t["text"])
    draw.rectangle([wx+30, wy+80, wx+ww-30, wy+112], fill=t["btn"], outline=(220,50,47), width=2)
    draw.text((wx+30, wy+125), "Password", font=get_font(12), fill=t["textMuted"] if "textMuted" in t else t["text"])
    draw.rectangle([wx+30, wy+145, wx+ww-30, wy+177], fill=t["btn"], outline=(220,50,47), width=2)
    # Error message
    draw.rectangle([wx+30, wy+195, wx+ww-30, wy+230], fill=(255,235,238) if "light" in theme else (80,20,20))
    msgs = ["Invalid username or password.", "Account locked after 5 failed attempts.", "Your password has expired. Please reset it."]
    draw.text((wx+45, wy+207), random.choice(msgs), font=get_font(13), fill=ERROR_COLORS["critical"])
    draw_button(draw, wx+30, wy+250, ww-60, 38, "Sign In", theme, primary=True)
    return img


def gen_mfa_error(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    wx, wy, ww, wh = 340, 150, 600, 420
    draw_window(draw, wx, wy, ww, wh, theme, "Two-Factor Authentication")
    draw.text((wx+30, wy+60), "Enter verification code", font=get_font(18), fill=t["text"])
    draw.text((wx+30, wy+90), "A code was sent to +91 ••••• ••789", font=get_font(13), fill=(128,128,128))
    # OTP boxes
    for i in range(6):
        bx = wx + 30 + i*80
        draw.rectangle([bx, wy+130, bx+65, wy+180], fill=t["btn"], outline=(220,50,47) if variant%2==0 else t["border"], width=2)
    draw.rectangle([wx+30, wy+200, wx+ww-30, wy+235], fill=(255,235,238) if "light" in theme else (80,20,20))
    errs = ["Invalid verification code. Please try again.", "Code has expired. Request a new one.", "Too many attempts. Account temporarily locked."]
    draw.text((wx+45, wy+212), random.choice(errs), font=get_font(13), fill=ERROR_COLORS["critical"])
    draw_button(draw, wx+30, wy+260, ww-60, 38, "Verify", theme, primary=True)
    draw.text((wx+30, wy+320), "Resend code", font=get_font(13), fill=t["accent"])
    draw.text((wx+30, wy+350), "Use a different verification method", font=get_font(13), fill=t["accent"])
    return img


def gen_session_expired(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    wx, wy, ww, wh = 290, 180, 700, 360
    draw_window(draw, wx, wy, ww, wh, theme, "Session Expired")
    draw_icon(draw, wx+40, wy+80, 55, "warning")
    msgs = [
        ("Your session has expired", "For security purposes, your session has timed out\nafter 30 minutes of inactivity.\nPlease sign in again to continue."),
        ("Authentication Required", "Your login session is no longer valid.\nThis may have occurred due to signing in from\nanother device or location."),
    ]
    title, msg = random.choice(msgs)
    draw.text((wx+110, wy+80), title, font=get_font(17), fill=ERROR_COLORS["warning"])
    y = wy + 115
    for line in msg.split('\n'):
        draw.text((wx+110, y), line, font=get_font(13), fill=t["text"])
        y += 20
    draw_button(draw, wx+ww-200, wy+wh-60, 160, 32, "Sign In Again", theme, primary=True)
    draw_button(draw, wx+ww-300, wy+wh-60, 90, 32, "Cancel", theme)
    return img


def gen_app_crash(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    wx, wy, ww, wh = 200, 150, 880, 420
    draw_window(draw, wx, wy, ww, wh, theme, "Application Error", icon_color=True)
    draw_icon(draw, wx+40, wy+80, 55, "error")
    apps  = ["Microsoft Teams", "Outlook", "Chrome", "SAP GUI", "VS Code", "Excel", "Slack"]
    app   = random.choice(apps)
    msgs  = [
        (f"{app} has stopped working",   f"A problem caused the program to stop working correctly.\nWindows will close the program and notify you if a solution is available.\n\nFault Module: ntdll.dll\nException Code: 0xc0000374"),
        (f"{app} is not responding",      f"The program is not responding.\nIf you close the program, you might lose information.\nTo close the program now, click Close Program."),
        (f"Segmentation fault (core dumped)", f"Process: {app.lower().replace(' ','')}\nPID: {random.randint(1000, 9999)}\nSignal: SIGSEGV\n\ncore dumped to /var/crash/"),
    ]
    title, msg = random.choice(msgs)
    draw.text((wx+110, wy+80), title, font=get_font(17), fill=ERROR_COLORS["critical"])
    y = wy + 115
    for line in msg.split('\n'):
        draw.text((wx+110, y), line, font=get_font(13), fill=t["text"])
        y += 20
    draw_button(draw, wx+ww-240, wy+wh-60, 110, 32, "Close Program", theme, primary=True)
    draw_button(draw, wx+ww-360, wy+wh-60, 110, 32, "Debug Info", theme)
    return img


def gen_update_error(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    wx, wy, ww, wh = 200, 130, 880, 460
    draw_window(draw, wx, wy, ww, wh, theme, "Windows Update — Error")
    draw_icon(draw, wx+40, wy+80, 55, "error")
    codes = ["0x80070002", "0x80073712", "0x800F0922", "0x80070422", "0xC1900101"]
    code  = random.choice(codes)
    msgs  = [
        (f"Updates failed — Error {code}", f"There were problems installing some updates, but we'll try again later.\nIf you keep seeing this and want to search the web or contact\nsupport for information, this may help: {code}"),
        ("Feature update failed",            f"Windows 11 update failed.\nError code: {code}\nWe couldn't complete the updates.\nUndoing changes. Don't turn off your computer."),
    ]
    title, msg = random.choice(msgs)
    draw.text((wx+110, wy+80), title, font=get_font(17), fill=ERROR_COLORS["critical"])
    y = wy + 115
    for line in msg.split('\n'):
        draw.text((wx+110, y), line, font=get_font(13), fill=t["text"])
        y += 20
    draw_button(draw, wx+ww-200, wy+wh-60, 160, 32, "Try again", theme, primary=True)
    return img


def gen_install_error(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    wx, wy, ww, wh = 200, 150, 880, 420
    draw_window(draw, wx, wy, ww, wh, theme, "Installation Error")
    draw_icon(draw, wx+40, wy+80, 55, "error")
    msgs = [
        ("Installation Failed",          "Error 1603: A fatal error occurred during installation.\nThe installer has encountered an unexpected error.\nThis installation package could not be opened."),
        ("Setup could not continue",     "The installation failed because a program being installed\nrequires administrator privileges.\nPlease run the installer as an administrator."),
        ("Dependency Error",             "Installation failed: Missing required dependency\nnpm ERR! peer dep missing: react@>=17, required by react-dom@18\nnpm ERR! Found: react@16.14.0"),
    ]
    title, msg = random.choice(msgs)
    draw.text((wx+110, wy+80), title, font=get_font(17), fill=ERROR_COLORS["critical"])
    y = wy + 115
    for line in msg.split('\n'):
        draw.text((wx+110, y), line, font=get_font(13), fill=t["text"])
        y += 20
    draw_button(draw, wx+ww-200, wy+wh-60, 90, 32, "OK", theme, primary=True)
    return img


def gen_dependency_error(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    # Terminal style
    bg2  = (12, 12, 12) if variant % 2 == 0 else (0, 43, 54)
    img2 = Image.new("RGB", IMG_SIZE, bg2)
    draw2 = ImageDraw.Draw(img2)
    draw2.rectangle([0, 0, IMG_SIZE[0], 40], fill=(40,40,40))
    draw2.text((20, 12), "Terminal", font=get_font(13), fill=(200,200,200))
    errors = [
        ["$ python app.py", "Traceback (most recent call last):", "  File 'app.py', line 3, in <module>", "    import tensorflow as tf", "ModuleNotFoundError: No module named 'tensorflow'"],
        ["$ node server.js", "Error: Cannot find module 'express'", "Require stack:", "- /app/server.js", "npm install express --save"],
        ["$ java -jar app.jar", "Exception in thread 'main' java.lang.NoClassDefFoundError:", "  com/google/gson/Gson", "Caused by: java.lang.ClassNotFoundException: com.google.gson.Gson"],
    ]
    lines = random.choice(errors)
    y = 60
    for i, line in enumerate(lines):
        color = (180, 180, 180) if i == 0 else (220, 50, 47) if "Error" in line or "Exception" in line or "ModuleNotFoundError" in line else (150, 150, 150)
        draw2.text((20, y), line, font=get_font(14), fill=color)
        y += 28
    return img2


def gen_db_connection_error(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, (12,12,12) if variant%2==0 else t["bg"])
    draw  = ImageDraw.Draw(img)
    tc    = (200,200,200) if variant%2==0 else t["text"]
    errors = [
        ["$ psql -U postgres -h localhost", "psql: error: connection to server on socket", '"/var/run/postgresql/.s.PGSQL.5432" failed:', "FATAL: role 'postgres' does not exist"],
        ["sqlalchemy.exc.OperationalError:", "(psycopg2.OperationalError) could not connect to server:", "Connection refused", "Is the server running on host 'localhost' and accepting", "TCP/IP connections on port 5432?"],
        ["ERROR 2002 (HY000): Can't connect to local MySQL", "server through socket '/tmp/mysql.sock' (2)", "mysqld is not running.", "systemctl status mysql → ● mysql.service: Failed"],
    ]
    lines = random.choice(errors)
    y = 60
    for line in lines:
        color = (220,50,47) if any(w in line for w in ["error","Error","ERROR","FATAL","failed","Failed"]) else tc
        draw.text((30, y), line, font=get_font(14), fill=color)
        y += 30
    return img


def gen_db_query_error(variant: int) -> Image.Image:
    img  = Image.new("RGB", IMG_SIZE, (12, 12, 12))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, IMG_SIZE[0], 40], fill=(30, 30, 30))
    draw.text((20, 12), "Database Query Error", font=get_font(13), fill=(200, 200, 200))
    errors = [
        ["ERROR 1064 (42000): You have an error in your SQL syntax;", "check the manual that corresponds to your MySQL server version", "for the right syntax to use near 'SELCT * FROM users' at line 1"],
        ["ERROR:  column 'usr_id' does not exist", "LINE 1: SELECT usr_id FROM users WHERE email = 'test@test.com'", "HINT:  Perhaps you meant to reference the column 'user_id'."],
        ["Violation of UNIQUE KEY constraint 'UQ_users_email'.", "Cannot insert duplicate key in object 'dbo.users'.", "The duplicate key value is (admin@company.com)."],
    ]
    lines = random.choice(errors)
    y = 60
    for line in lines:
        color = (220, 50, 47) if "ERROR" in line or "Violation" in line else (180, 180, 180)
        draw.text((20, y), line, font=get_font(14), fill=color)
        y += 30
    return img


def gen_db_timeout(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    wx, wy, ww, wh = 200, 150, 880, 400
    draw_window(draw, wx, wy, ww, wh, theme, "Database Timeout")
    draw_icon(draw, wx+40, wy+80, 55, "warning")
    msgs = [
        ("Query Timeout",          "The query exceeded the maximum allowed execution time.\nQuery: SELECT * FROM audit_logs WHERE...\nExecution time: 31.2s > timeout: 30s"),
        ("Connection Pool Timeout","Unable to acquire a connection from the pool within 30 seconds.\nAll connections are currently in use.\nActive connections: 100/100"),
        ("Lock Wait Timeout",      "ERROR 1205 (HY000): Lock wait timeout exceeded;\ntry restarting transaction\nLocked table: orders\nWaiting for: UPDATE orders SET status='shipped'"),
    ]
    title, msg = random.choice(msgs)
    draw.text((wx+110, wy+80), title, font=get_font(17), fill=ERROR_COLORS["warning"])
    y = wy + 115
    for line in msg.split('\n'):
        draw.text((wx+110, y), line, font=get_font(13), fill=t["text"])
        y += 20
    draw_button(draw, wx+ww-120, wy+wh-60, 90, 32, "OK", theme, primary=True)
    return img


def gen_cloud_auth_error(variant: int) -> Image.Image:
    themes_cloud = ["AWS", "Azure", "GCP"]
    provider = random.choice(themes_cloud)
    colors = {"AWS": (255, 153, 0), "Azure": (0, 120, 212), "GCP": (66, 133, 244)}
    img  = Image.new("RGB", IMG_SIZE, (255, 255, 255) if variant%2==0 else (32,32,32))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, IMG_SIZE[0], 70], fill=colors[provider])
    draw.text((30, 22), f"{'AWS Management Console' if provider=='AWS' else provider+' Portal'}", font=get_font(18), fill=(255,255,255))
    tc = (32,32,32) if variant%2==0 else (220,220,220)
    msgs = {
        "AWS": [("AccessDenied", "User: arn:aws:iam::123456789:user/dev-user\nis not authorized to perform: s3:GetObject\non resource: arn:aws:s3:::prod-bucket/*\nError Code: AccessDenied")],
        "Azure": [("Authorization failed", "The client does not have authorization to perform action\n'Microsoft.Compute/virtualMachines/start/action'\nover scope '/subscriptions/xxx/resourceGroups/prod'\nStatus: 403 Forbidden")],
        "GCP": [("Permission Denied", "ERROR: (gcloud.compute.instances.list) PERMISSION_DENIED:\nRequest had insufficient authentication scopes.\nRequired: compute.instances.list\nStatus: 403")],
    }
    title, msg = random.choice(msgs[provider])
    draw.text((50, 100), title, font=get_font(24), fill=ERROR_COLORS["critical"])
    y = 145
    for line in msg.split('\n'):
        draw.text((50, y), line, font=get_font(13), fill=(128,128,128))
        y += 22
    return img


def gen_deployment_error(variant: int) -> Image.Image:
    img  = Image.new("RGB", IMG_SIZE, (13, 17, 23))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, IMG_SIZE[0], 50], fill=(22, 27, 34))
    draw.text((20, 15), "GitHub Actions — CI/CD Pipeline", font=get_font(14), fill=(201, 209, 217))
    pipelines = [
        ["▶ Run tests", "  ✓ Unit tests passed (127/127)", "  ✓ Integration tests passed", "▶ Build Docker image", "  ✓ Building image...", "▶ Deploy to production", "  ✗ Deployment failed", "  Error: ImagePullBackOff", "  kubectl: pods are in 'CrashLoopBackOff' state"],
        ["▶ npm install", "  ✓ Dependencies installed", "▶ npm run build", "  ✗ Build failed", "  ERROR in ./src/components/App.tsx", "  Module not found: Can't resolve './Dashboard'", "  Error: Build process exited with code 1"],
        ["$ docker-compose up --build", "Building api...", "Step 7/12: RUN pip install -r requirements.txt", " ---> ERROR", "The command '/bin/sh -c pip install -r requirements.txt' returned a non-zero code: 1"],
    ]
    lines = random.choice(pipelines)
    y = 70
    for line in lines:
        color = (220,50,47) if "✗" in line or "Error" in line or "ERROR" in line or "failed" in line else (63,185,80) if "✓" in line else (201,209,217)
        draw.text((20, y), line, font=get_font(13), fill=color)
        y += 26
    return img


def gen_container_error(variant: int) -> Image.Image:
    img  = Image.new("RGB", IMG_SIZE, (13, 17, 23))
    draw = ImageDraw.Draw(img)
    errors = [
        ["$ kubectl get pods", "NAME                          READY   STATUS             RESTARTS", "api-deployment-7d9f8b-xk2pq   0/1     CrashLoopBackOff   8", "db-deployment-5c6d7e-mn4rs    0/1     ImagePullBackOff   0", "web-deployment-3a4b5c-qr7st   1/1     Running            0", "", "$ kubectl describe pod api-deployment-7d9f8b-xk2pq", "Events: Back-off restarting failed container"],
        ["$ docker ps -a", "CONTAINER ID  IMAGE      STATUS                      PORTS", "a1b2c3d4e5f6  nginx:latest  Exited (1) 2 minutes ago", "", "$ docker logs a1b2c3d4e5f6", "nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)", "nginx: configuration file /etc/nginx/nginx.conf test failed"],
        ["Error response from daemon: OCI runtime create failed:", "container_linux.go:380: starting container process caused:", "process_linux.go:545: container init caused:", "rootfs_linux.go:76: mounting '/host/proc' to rootfs ...", "operation not permitted: unknown"],
    ]
    lines = random.choice(errors)
    y = 30
    for line in lines:
        color = (220,50,47) if any(w in line for w in ["Error","error","failed","Failed","Exited","CrashLoop","Back-off"]) else (201,209,217)
        draw.text((20, y), line, font=get_font(13), fill=color)
        y += 26
    return img


def gen_general_error(variant: int) -> Image.Image:
    theme = random.choice(list(THEMES.keys()))
    t     = THEMES[theme]
    img   = Image.new("RGB", IMG_SIZE, t["bg"])
    draw  = ImageDraw.Draw(img)
    wx, wy, ww, wh = 300, 200, 680, 320
    draw_window(draw, wx, wy, ww, wh, theme, "Error", icon_color=True)
    draw_icon(draw, wx+40, wy+70, 50, "error")
    msgs = [
        ("An unexpected error occurred",   "The operation could not be completed.\nAn unexpected error occurred.\nError code: 0xDEADBEEF"),
        ("Something went wrong",           "We encountered an unexpected error.\nPlease try again. If the problem persists,\ncontact IT support."),
        ("Internal Server Error",          "500 Internal Server Error\nThe server encountered an internal error\nand was unable to complete your request."),
        ("Operation failed",               "The requested operation failed.\nReason: Unknown error (-1)\nPlease restart the application."),
    ]
    title, msg = random.choice(msgs)
    draw.text((wx+105, wy+70), title, font=get_font(16), fill=ERROR_COLORS["critical"])
    y = wy + 100
    for line in msg.split('\n'):
        draw.text((wx+105, y), line, font=get_font(13), fill=t["text"])
        y += 20
    draw_button(draw, wx+ww-120, wy+wh-55, 90, 32, "OK", theme, primary=True)
    return img


# ── Generator map ─────────────────────────────────────────────────────────────
GENERATORS = {
    "bsod":               gen_bsod,
    "memory_error":       gen_memory_error,
    "cpu_high":           gen_cpu_high,
    "disk_full":          gen_disk_full,
    "hardware_failure":   gen_hardware_failure,
    "dns_error":          gen_dns_error,
    "network_unreachable":gen_network_unreachable,
    "vpn_error":          gen_vpn_error,
    "ssl_error":          gen_ssl_error,
    "timeout":            gen_timeout,
    "permission_denied":  gen_permission_denied,
    "login_failed":       gen_login_failed,
    "mfa_error":          gen_mfa_error,
    "session_expired":    gen_session_expired,
    "app_crash":          gen_app_crash,
    "update_error":       gen_update_error,
    "install_error":      gen_install_error,
    "dependency_error":   gen_dependency_error,
    "db_connection_error":gen_db_connection_error,
    "db_query_error":     gen_db_query_error,
    "db_timeout":         gen_db_timeout,
    "cloud_auth_error":   gen_cloud_auth_error,
    "deployment_error":   gen_deployment_error,
    "container_error":    gen_container_error,
    "general_error":      gen_general_error,
}


def apply_augmentation(img: Image.Image, variant: int) -> Image.Image:
    """Apply random augmentations for variety."""
    from PIL import ImageEnhance, ImageFilter
    # Random brightness
    if variant % 5 == 0:
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(random.uniform(0.7, 1.3))
    # Random contrast
    if variant % 7 == 0:
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(random.uniform(0.8, 1.2))
    # Slight blur (simulate screenshot compression)
    if variant % 9 == 0:
        img = img.filter(ImageFilter.GaussianBlur(radius=0.5))
    # Random crop and resize (simulate partial screenshots)
    if variant % 11 == 0:
        w, h = img.size
        margin = random.randint(0, 50)
        img = img.crop([margin, margin, w-margin, h-margin])
        img = img.resize(IMG_SIZE, Image.LANCZOS)
    # Different resolution simulation
    if variant % 13 == 0:
        scale = random.choice([0.75, 0.85, 0.95])
        new_w = int(IMG_SIZE[0] * scale)
        new_h = int(IMG_SIZE[1] * scale)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        img = img.resize(IMG_SIZE, Image.LANCZOS)
    return img


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    total   = len(CLASSES) * IMAGES_PER_CLASS
    current = 0

    print("=" * 60)
    print("  NexusDesk CNN — Screenshot Generator")
    print("=" * 60)
    print(f"  Classes:     {len(CLASSES)}")
    print(f"  Per class:   {IMAGES_PER_CLASS}")
    print(f"  Total:       {total}")
    print(f"  Output:      {OUTPUT_DIR}")
    print("=" * 60)

    for cls in CLASSES:
        cls_dir = os.path.join(OUTPUT_DIR, cls)
        os.makedirs(cls_dir, exist_ok=True)
        generator = GENERATORS[cls]

        print(f"\n  Generating {cls}...", end=' ', flush=True)

        for i in range(IMAGES_PER_CLASS):
            try:
                img = generator(i)
                img = apply_augmentation(img, i)
                # Ensure correct size
                if img.size != IMG_SIZE:
                    img = img.resize(IMG_SIZE, Image.LANCZOS)
                img.save(os.path.join(cls_dir, f"{cls}_{i:04d}.png"))
                current += 1
            except Exception as e:
                print(f"\n    ⚠ Error generating {cls}_{i}: {e}")

        print(f"✓ {IMAGES_PER_CLASS} images")

    print(f"\n{'='*60}")
    print(f"  ✅ Done! {current} screenshots generated")
    print(f"  Output: {OUTPUT_DIR}")
    print(f"{'='*60}")
    print(f"\n  Next: PYTHONPATH=. python3 app/ml/cnn/train.py")


if __name__ == "__main__":
    main()