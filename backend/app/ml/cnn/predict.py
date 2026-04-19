# File: backend/app/ml/cnn/predict.py
#
# Inference module for NexusDesk CNN Error Screenshot Classifier
# Loaded once at FastAPI startup, reused for every screenshot.
#
# Usage:
#   from app.ml.cnn.predict import predict_screenshot
#   result = predict_screenshot(image_bytes)

import os
import io
from typing import Optional

import torch
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image

BASE_DIR    = os.path.dirname(__file__)
MODEL_PATH  = os.path.join(BASE_DIR, "data", "cnn_model.pth")
IMG_SIZE    = 224
CONFIDENCE_THRESHOLD = 0.60  # below this → fallback to general_error

# Domain mapping per error class
CLASS_TO_DOMAIN = {
    "bsod":               "hardware",
    "memory_error":       "hardware",
    "cpu_high":           "infrastructure",
    "disk_full":          "infrastructure",
    "hardware_failure":   "hardware",
    "dns_error":          "networking",
    "network_unreachable":"networking",
    "vpn_error":          "networking",
    "ssl_error":          "security",
    "timeout":            "networking",
    "permission_denied":  "security",
    "login_failed":       "identity_access",
    "mfa_error":          "identity_access",
    "session_expired":    "identity_access",
    "app_crash":          "software",
    "update_error":       "software",
    "install_error":      "software",
    "dependency_error":   "devops",
    "db_connection_error":"database",
    "db_query_error":     "database",
    "db_timeout":         "database",
    "cloud_auth_error":   "cloud",
    "deployment_error":   "devops",
    "container_error":    "devops",
    "general_error":      "other",
}

# Severity mapping per error class
CLASS_TO_SEVERITY = {
    "bsod":               "critical",
    "memory_error":       "high",
    "cpu_high":           "high",
    "disk_full":          "high",
    "hardware_failure":   "critical",
    "dns_error":          "high",
    "network_unreachable":"critical",
    "vpn_error":          "high",
    "ssl_error":          "high",
    "timeout":            "medium",
    "permission_denied":  "high",
    "login_failed":       "medium",
    "mfa_error":          "medium",
    "session_expired":    "low",
    "app_crash":          "high",
    "update_error":       "medium",
    "install_error":      "medium",
    "dependency_error":   "medium",
    "db_connection_error":"critical",
    "db_query_error":     "high",
    "db_timeout":         "high",
    "cloud_auth_error":   "high",
    "deployment_error":   "critical",
    "container_error":    "critical",
    "general_error":      "medium",
}

# Human-readable labels
CLASS_LABELS = {
    "bsod":               "Windows Blue Screen of Death (BSOD)",
    "memory_error":       "Memory / Out of Memory Error",
    "cpu_high":           "High CPU Usage",
    "disk_full":          "Disk Full / Low Storage",
    "hardware_failure":   "Hardware Failure / Driver Error",
    "dns_error":          "DNS Resolution Failure",
    "network_unreachable":"Network Unreachable / No Internet",
    "vpn_error":          "VPN Connection Error",
    "ssl_error":          "SSL / Certificate Error",
    "timeout":            "Connection / Request Timeout",
    "permission_denied":  "Permission Denied / Access Error",
    "login_failed":       "Login / Authentication Failed",
    "mfa_error":          "MFA / Two-Factor Auth Error",
    "session_expired":    "Session Expired",
    "app_crash":          "Application Crash / Not Responding",
    "update_error":       "Software Update Error",
    "install_error":      "Installation Failed",
    "dependency_error":   "Missing Dependency / Module Error",
    "db_connection_error":"Database Connection Error",
    "db_query_error":     "Database Query / SQL Error",
    "db_timeout":         "Database Timeout",
    "cloud_auth_error":   "Cloud Permission / Auth Error",
    "deployment_error":   "Deployment / CI-CD Pipeline Error",
    "container_error":    "Container / Docker / Kubernetes Error",
    "general_error":      "General Error",
}

# ── Transform ─────────────────────────────────────────────────────────────────
_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# ── Lazy load ─────────────────────────────────────────────────────────────────
_model       = None
_class_names = None
_device      = "mps" if torch.backends.mps.is_available() else "cpu"


def _load_model():
    global _model, _class_names

    if _model is not None:
        return

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"CNN model not found at {MODEL_PATH}. "
            "Run generate_screenshots.py then train.py first."
        )

    from app.ml.cnn.model import build_model
    checkpoint   = torch.load(MODEL_PATH, map_location=_device)
    _class_names = checkpoint.get("class_names", list(CLASS_TO_DOMAIN.keys()))
    _model       = build_model(num_classes=len(_class_names), pretrained=False).to(_device)
    _model.load_state_dict(checkpoint["model_state"])
    _model.eval()
    print(f"  ✓ CNN model loaded ({checkpoint.get('val_acc', 0)*100:.1f}% val accuracy)")


def predict_screenshot(image_bytes: bytes) -> dict:
    """
    Predict the error type from a screenshot.

    Args:
        image_bytes: Raw image bytes (PNG, JPEG, etc.)

    Returns:
        {
            "error_class":   "dns_error",
            "label":         "DNS Resolution Failure",
            "confidence":    0.92,
            "domain":        "networking",
            "severity":      "high",
            "reliable":      True,
            "top3": [
                {"class": "dns_error",          "confidence": 0.92},
                {"class": "network_unreachable", "confidence": 0.05},
                {"class": "timeout",             "confidence": 0.02},
            ]
        }
    """
    try:
        _load_model()
    except FileNotFoundError as e:
        return {
            "error_class": "general_error",
            "label":       "Model not trained yet",
            "confidence":  0.0,
            "domain":      "other",
            "severity":    "medium",
            "reliable":    False,
            "error":       str(e),
        }

    # Load and preprocess image
    img    = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = _transform(img).unsqueeze(0).to(_device)

    with torch.no_grad():
        outputs = _model(tensor)
        probs   = F.softmax(outputs, dim=1)[0]

    top3_vals, top3_idx = torch.topk(probs, 3)
    top3 = [
        {"class": _class_names[idx], "confidence": round(float(val), 4)}
        for idx, val in zip(top3_idx.tolist(), top3_vals.tolist())
    ]

    best_class = _class_names[top3_idx[0].item()]
    confidence = float(top3_vals[0].item())
    reliable   = confidence >= CONFIDENCE_THRESHOLD

    # Fall back to general_error if not confident
    if not reliable:
        best_class = "general_error"

    return {
        "error_class": best_class,
        "label":       CLASS_LABELS.get(best_class, best_class),
        "confidence":  round(confidence, 4),
        "domain":      CLASS_TO_DOMAIN.get(best_class, "other"),
        "severity":    CLASS_TO_SEVERITY.get(best_class, "medium"),
        "reliable":    reliable,
        "top3":        top3,
    }


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  NexusDesk CNN — Inference Test")
    print("=" * 60)
    print("  Generate screenshots and train first, then test here.")
    print("  Usage: from app.ml.cnn.predict import predict_screenshot")