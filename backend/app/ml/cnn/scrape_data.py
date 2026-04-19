# File: backend/app/ml/cnn/scrape_data.py
#
# Scrapes real IT error screenshots from Stack Overflow and GitHub
# Adds to existing synthetic dataset for Layer 2 training
#
# Run: PYTHONPATH=. python3 app/ml/cnn/scrape_data.py

import os
import re
import time
import requests
from urllib.parse import urlparse
from PIL import Image
import io

BASE_DIR   = os.path.dirname(__file__)
OUTPUT_DIR = os.path.join(BASE_DIR, "data", "screenshots")

# Stack Overflow API key (optional - works without, higher rate limit with)
SO_API_KEY = ""  # get free key at stackapps.com if needed

# Target per class from real data
REAL_IMAGES_TARGET = 50

# ── Search queries per class ──────────────────────────────────────────────────
CLASS_QUERIES = {
    "bsod": [
        "windows blue screen of death BSOD",
        "BSOD error stop code windows",
        "windows crash blue screen MEMORY_MANAGEMENT",
    ],
    "memory_error": [
        "out of memory error java heap space screenshot",
        "OutOfMemoryError screenshot",
        "memory allocation failed error",
    ],
    "cpu_high": [
        "task manager 100% CPU usage screenshot",
        "high CPU usage windows task manager",
        "process CPU spike screenshot",
    ],
    "disk_full": [
        "disk full error windows screenshot",
        "no space left on device error",
        "low disk space warning screenshot",
    ],
    "hardware_failure": [
        "device not recognized USB error screenshot",
        "driver error device manager screenshot",
        "hardware failure error windows",
    ],
    "dns_error": [
        "DNS_PROBE_FINISHED_NXDOMAIN chrome screenshot",
        "ERR_NAME_NOT_RESOLVED browser error",
        "DNS resolution failed screenshot",
    ],
    "network_unreachable": [
        "ERR_INTERNET_DISCONNECTED chrome screenshot",
        "no internet connection browser error page",
        "network unreachable error screenshot",
    ],
    "vpn_error": [
        "VPN connection failed error 789 screenshot",
        "VPN authentication failed error screenshot",
        "cisco anyconnect VPN error screenshot",
    ],
    "ssl_error": [
        "NET::ERR_CERT_AUTHORITY_INVALID chrome screenshot",
        "SSL certificate error browser screenshot",
        "your connection is not private chrome",
    ],
    "timeout": [
        "ERR_CONNECTION_TIMED_OUT chrome screenshot",
        "connection timeout error screenshot",
        "504 gateway timeout screenshot",
    ],
    "permission_denied": [
        "access denied error windows screenshot",
        "permission denied linux terminal screenshot",
        "you don't have permission to access folder",
    ],
    "login_failed": [
        "invalid username password error screenshot",
        "login failed authentication error screenshot",
        "account locked failed login attempts",
    ],
    "mfa_error": [
        "two factor authentication failed screenshot",
        "MFA error invalid code screenshot",
        "authenticator app error screenshot",
    ],
    "session_expired": [
        "session expired please login again screenshot",
        "your session has timed out screenshot",
        "authentication required session expired",
    ],
    "app_crash": [
        "application has stopped working windows screenshot",
        "program not responding windows error",
        "segmentation fault core dumped terminal",
    ],
    "update_error": [
        "windows update failed error 0x80070002 screenshot",
        "update error windows 10 screenshot",
        "software update failed error screenshot",
    ],
    "install_error": [
        "installation failed error 1603 screenshot",
        "setup could not continue installation error",
        "npm install error screenshot terminal",
    ],
    "dependency_error": [
        "ModuleNotFoundError python screenshot terminal",
        "Cannot find module node error screenshot",
        "missing DLL error windows screenshot",
    ],
    "db_connection_error": [
        "psycopg2 OperationalError could not connect postgres",
        "MySQL connection refused error screenshot",
        "database connection failed error screenshot",
    ],
    "db_query_error": [
        "SQL syntax error MySQL screenshot",
        "column does not exist postgres error",
        "database query error screenshot terminal",
    ],
    "db_timeout": [
        "database query timeout error screenshot",
        "lock wait timeout exceeded MySQL screenshot",
        "connection pool timeout error screenshot",
    ],
    "cloud_auth_error": [
        "AWS AccessDenied error screenshot console",
        "Azure authorization failed 403 screenshot",
        "GCP permission denied error screenshot",
    ],
    "deployment_error": [
        "github actions deployment failed screenshot",
        "CI CD pipeline failed error screenshot",
        "docker build failed error screenshot",
    ],
    "container_error": [
        "kubectl CrashLoopBackOff error screenshot",
        "docker container exited error screenshot",
        "kubernetes pod error ImagePullBackOff",
    ],
    "general_error": [
        "unexpected error occurred application screenshot",
        "500 internal server error screenshot",
        "something went wrong error dialog screenshot",
    ],
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}


def download_image(url: str, save_path: str) -> bool:
    """Download and validate an image."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=10, stream=True)
        if response.status_code != 200:
            return False

        content_type = response.headers.get("content-type", "")
        if "image" not in content_type:
            return False

        img_bytes = response.content
        if len(img_bytes) < 5000:  # skip tiny images
            return False

        # Validate and resize
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        w, h = img.size
        if w < 200 or h < 150:  # skip too small
            return False

        img = img.resize((1280, 720), Image.LANCZOS)
        img.save(save_path, "PNG")
        return True
    except Exception:
        return False


def scrape_stack_overflow(query: str, cls: str, count: int = 15) -> list:
    """Scrape Stack Overflow for screenshots related to query."""
    urls = []
    try:
        # Search Stack Overflow for questions
        search_url = "https://api.stackexchange.com/2.3/search/advanced"
        params = {
            "order":    "desc",
            "sort":     "relevance",
            "q":        query,
            "site":     "stackoverflow",
            "pagesize": 20,
            "filter":   "withbody",
        }
        if SO_API_KEY:
            params["key"] = SO_API_KEY

        response = requests.get(search_url, params=params, timeout=10)
        if response.status_code != 200:
            return urls

        data = response.json()
        items = data.get("items", [])

        for item in items[:10]:
            body = item.get("body", "")
            # Extract image URLs from HTML
            img_urls = re.findall(r'src="(https?://[^"]+\.(?:png|jpg|jpeg|gif))"', body, re.IGNORECASE)
            img_urls += re.findall(r'https://i\.stack\.imgur\.com/[A-Za-z0-9]+\.(?:png|jpg|jpeg)', body)
            urls.extend(img_urls[:3])

        time.sleep(0.5)
    except Exception as e:
        print(f"    ⚠ Stack Overflow error: {e}")
    return urls


def scrape_github(query: str, cls: str, count: int = 15) -> list:
    """Scrape GitHub issues for screenshots."""
    urls = []
    try:
        search_url = "https://api.github.com/search/issues"
        params = {
            "q":        f"{query} is:issue",
            "per_page": 20,
            "sort":     "relevance",
        }
        headers = {**HEADERS, "Accept": "application/vnd.github.v3+json"}
        response = requests.get(search_url, params=params, headers=headers, timeout=10)
        if response.status_code != 200:
            return urls

        data = response.json()
        items = data.get("items", [])

        for item in items[:10]:
            body = item.get("body", "") or ""
            # Extract GitHub user-content images
            img_urls = re.findall(
                r'https://user-images\.githubusercontent\.com/[^\s\)\"]+',
                body
            )
            img_urls += re.findall(
                r'https://github\.com/[^\s\)\"]+\.(?:png|jpg|jpeg)',
                body
            )
            urls.extend(img_urls[:3])

        time.sleep(1)
    except Exception as e:
        print(f"    ⚠ GitHub error: {e}")
    return urls


def scrape_class(cls: str, queries: list, target: int) -> int:
    """Scrape images for a specific error class."""
    cls_dir = os.path.join(OUTPUT_DIR, cls)
    os.makedirs(cls_dir, exist_ok=True)

    # Count existing images
    existing = len([f for f in os.listdir(cls_dir) if f.endswith('.png')])
    needed   = target
    saved    = 0
    idx      = existing + 1000  # offset to avoid overwriting synthetic

    all_urls = []
    for query in queries:
        all_urls += scrape_stack_overflow(query, cls, 15)
        all_urls += scrape_github(query, cls, 15)

    # Deduplicate
    all_urls = list(set(all_urls))

    for url in all_urls:
        if saved >= needed:
            break
        save_path = os.path.join(cls_dir, f"{cls}_real_{idx:04d}.png")
        if download_image(url, save_path):
            saved += 1
            idx   += 1

    return saved


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    total_classes  = len(CLASS_QUERIES)
    total_saved    = 0
    current        = 0

    print("=" * 60)
    print("  NexusDesk CNN — Layer 2 Real Screenshot Scraper")
    print("=" * 60)
    print(f"  Classes:       {total_classes}")
    print(f"  Target/class:  {REAL_IMAGES_TARGET}")
    print(f"  Sources:       Stack Overflow + GitHub")
    print(f"  Output:        {OUTPUT_DIR}")
    print("=" * 60 + "\n")

    for cls, queries in CLASS_QUERIES.items():
        current += 1
        print(f"[{current:02d}/{total_classes}] {cls:25s} ... ", end='', flush=True)
        saved = scrape_class(cls, queries, REAL_IMAGES_TARGET)
        total_saved += saved
        print(f"✓ {saved} real images")
        time.sleep(1)

    print(f"\n{'='*60}")
    print(f"  ✅ Done!")
    print(f"  Real images saved: {total_saved}")
    print(f"  Now retrain: PYTHONPATH=. python3 app/ml/cnn/train.py")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()