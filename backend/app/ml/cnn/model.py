# File: backend/app/ml/cnn/model.py
#
# ResNet50-based IT Error Screenshot Classifier for NexusDesk
# Fine-tuned on 25 IT error classes
#
# Architecture:
#   ResNet50 (pretrained ImageNet) → freeze base → custom head
#   GlobalAvgPool → Dense(512) → BN → Dropout → Dense(25, Softmax)

import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import torch
import torch.nn as nn
from torchvision import models


CLASSES = [
    "bsod", "memory_error", "cpu_high", "disk_full", "hardware_failure",
    "dns_error", "network_unreachable", "vpn_error", "ssl_error", "timeout",
    "permission_denied", "login_failed", "mfa_error", "session_expired",
    "app_crash", "update_error", "install_error", "dependency_error",
    "db_connection_error", "db_query_error", "db_timeout",
    "cloud_auth_error", "deployment_error", "container_error", "general_error",
]

NUM_CLASSES = len(CLASSES)
IMG_SIZE    = 224


class NexusDeskCNN(nn.Module):
    """
    ResNet50 fine-tuned for IT error screenshot classification.

    Architecture:
    - Base: ResNet50 pretrained on ImageNet (learns visual features)
    - Frozen layers: first 140 layers (preserve learned features)
    - Unfrozen: last 10 layers + custom head (fine-tune for IT errors)
    - Custom head: GlobalAvgPool → Dense(512) → BN → Dropout(0.5) → Dense(25)

    Why ResNet50:
    - Skip connections prevent vanishing gradients on deep network
    - Pretrained weights understand edges, shapes, text regions
    - Fast convergence with small dataset via transfer learning
    """

    def __init__(self, num_classes: int = NUM_CLASSES, pretrained: bool = True):
        super(NexusDeskCNN, self).__init__()

        # Load pretrained ResNet50
        weights = models.ResNet50_Weights.IMAGENET1K_V1 if pretrained else None
        self.backbone = models.resnet50(weights=weights)

        # Freeze all layers first
        for param in self.backbone.parameters():
            param.requires_grad = False

        # Unfreeze last layer group (layer4) for fine-tuning
        for param in self.backbone.layer4.parameters():
            param.requires_grad = True

        # Replace final classification head
        in_features = self.backbone.fc.in_features  # 2048 for ResNet50
        self.backbone.fc = nn.Sequential(
            nn.Linear(in_features, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.5),
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.3),
            nn.Linear(256, num_classes),
        )

    def forward(self, x):
        return self.backbone(x)


def build_model(num_classes: int = NUM_CLASSES, pretrained: bool = True) -> NexusDeskCNN:
    model = NexusDeskCNN(num_classes=num_classes, pretrained=pretrained)
    return model


def count_parameters(model: nn.Module) -> dict:
    total     = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    return {"total": total, "trainable": trainable, "frozen": total - trainable}


def print_summary(model: nn.Module) -> None:
    params = count_parameters(model)
    print("\n" + "=" * 60)
    print("  NexusDesk CNN — Model Summary")
    print("=" * 60)
    print(f"  Architecture:  ResNet50 + Custom Head")
    print(f"  Classes:       {NUM_CLASSES}")
    print(f"  Input size:    {IMG_SIZE}×{IMG_SIZE}×3")
    print(f"  Total params:  {params['total']:,}")
    print(f"  Trainable:     {params['trainable']:,}")
    print(f"  Frozen:        {params['frozen']:,}")
    print("=" * 60)
    print()


if __name__ == "__main__":
    model = build_model()
    print_summary(model)
    # Test forward pass
    import torch
    x = torch.randn(2, 3, IMG_SIZE, IMG_SIZE)
    out = model(x)
    print(f"  Input shape:  {x.shape}")
    print(f"  Output shape: {out.shape}")
    print(f"  Output (first sample): {torch.softmax(out[0], dim=0).detach().numpy()[:5]}...")