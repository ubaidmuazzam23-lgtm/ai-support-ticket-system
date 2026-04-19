# File: backend/app/ml/cnn/train.py
#
# Training pipeline for NexusDesk CNN Error Screenshot Classifier
#
# Run: PYTHONPATH=. python3 app/ml/cnn/train.py

import os
import json
import time
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns

from app.ml.cnn.model import build_model, CLASSES, NUM_CLASSES, IMG_SIZE, print_summary

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(__file__)
DATA_DIR    = os.path.join(BASE_DIR, "data", "screenshots")
MODEL_PATH  = os.path.join(BASE_DIR, "data", "cnn_model.pth")
HISTORY_PATH= os.path.join(BASE_DIR, "data", "training_history.json")
PLOT_PATH   = os.path.join(BASE_DIR, "data", "training_curves.png")
CM_PATH     = os.path.join(BASE_DIR, "data", "confusion_matrix.png")
REPORT_PATH = os.path.join(BASE_DIR, "data", "classification_report.txt")

# ── Hyperparameters ───────────────────────────────────────────────────────────
BATCH_SIZE   = 32
EPOCHS       = 10
LR           = 1e-3
WEIGHT_DECAY = 1e-4
VAL_SPLIT    = 0.20
PATIENCE     = 3     # early stopping patience
DEVICE       = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"


# ── Data transforms ───────────────────────────────────────────────────────────

train_transforms = transforms.Compose([
    transforms.Resize((IMG_SIZE + 32, IMG_SIZE + 32)),
    transforms.RandomCrop(IMG_SIZE),
    transforms.RandomHorizontalFlip(p=0.3),
    transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
    transforms.RandomRotation(degrees=5),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

val_transforms = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def load_data():
    print("📂 Loading dataset...")
    full_dataset = datasets.ImageFolder(DATA_DIR)
    total = len(full_dataset)
    val_size   = int(total * VAL_SPLIT)
    train_size = total - val_size
    train_ds, val_ds = random_split(full_dataset, [train_size, val_size], generator=torch.Generator().manual_seed(42))

    # Apply different transforms
    train_ds.dataset.transform = train_transforms
    val_ds_copy = datasets.ImageFolder(DATA_DIR, transform=val_transforms)
    val_indices = val_ds.indices
    val_subset  = torch.utils.data.Subset(val_ds_copy, val_indices)

    train_loader = DataLoader(train_ds,  batch_size=BATCH_SIZE, shuffle=True,  num_workers=0, pin_memory=True)
    val_loader   = DataLoader(val_subset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0, pin_memory=True)

    print(f"   Total images:  {total}")
    print(f"   Train:         {train_size}")
    print(f"   Val:           {val_size}")
    print(f"   Classes:       {len(full_dataset.classes)}")
    print(f"   Device:        {DEVICE}")

    return train_loader, val_loader, full_dataset.classes


def train_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss, correct, total = 0, 0, 0
    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss    = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        correct += predicted.eq(labels).sum().item()
        total   += images.size(0)
    return total_loss / total, correct / total


def val_epoch(model, loader, criterion, device):
    model.eval()
    total_loss, correct, total = 0, 0, 0
    all_preds, all_labels = [], []
    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss    = criterion(outputs, labels)
            total_loss += loss.item() * images.size(0)
            _, predicted = outputs.max(1)
            correct += predicted.eq(labels).sum().item()
            total   += images.size(0)
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
    return total_loss / total, correct / total, all_preds, all_labels


def plot_history(history):
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle('NexusDesk CNN — Training Curves', fontsize=14, fontweight='bold')
    axes[0].plot(history['train_acc'],  label='Train', color='#174D38', linewidth=2)
    axes[0].plot(history['val_acc'],    label='Val',   color='#4d9e78', linewidth=2, linestyle='--')
    axes[0].set_title('Accuracy'); axes[0].set_xlabel('Epoch'); axes[0].legend(); axes[0].grid(alpha=0.3)
    axes[1].plot(history['train_loss'], label='Train', color='#4D1717', linewidth=2)
    axes[1].plot(history['val_loss'],   label='Val',   color='#a04040', linewidth=2, linestyle='--')
    axes[1].set_title('Loss'); axes[1].set_xlabel('Epoch'); axes[1].legend(); axes[1].grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(PLOT_PATH, dpi=150, bbox_inches='tight')
    print(f"   Plot saved: {PLOT_PATH}")


def main():
    print("\n" + "=" * 60)
    print("  NexusDesk CNN — Training Pipeline")
    print("=" * 60 + "\n")

    torch.manual_seed(42)
    np.random.seed(42)

    train_loader, val_loader, class_names = load_data()

    model = build_model(num_classes=len(class_names), pretrained=True).to(DEVICE)
    print_summary(model)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LR, weight_decay=WEIGHT_DECAY
    )
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS, eta_min=1e-6)

    history      = {"train_loss": [], "val_loss": [], "train_acc": [], "val_acc": []}
    best_val_acc = 0.0
    patience_cnt = 0

    print("\n🚀 Training...\n")
    for epoch in range(1, EPOCHS + 1):
        start = time.time()
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, DEVICE)
        val_loss, val_acc, preds, labels = val_epoch(model, val_loader, criterion, DEVICE)
        scheduler.step()

        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["train_acc"].append(train_acc)
        history["val_acc"].append(val_acc)

        elapsed = time.time() - start
        improved = "✓ Best" if val_acc > best_val_acc else ""
        print(f"  Epoch {epoch:02d}/{EPOCHS} | Train: {train_acc:.3f} ({train_loss:.3f}) | Val: {val_acc:.3f} ({val_loss:.3f}) | {elapsed:.1f}s {improved}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save({
                "epoch":       epoch,
                "model_state": model.state_dict(),
                "val_acc":     val_acc,
                "class_names": class_names,
            }, MODEL_PATH)
            patience_cnt = 0
        else:
            patience_cnt += 1
            if patience_cnt >= PATIENCE:
                print(f"\n  Early stopping at epoch {epoch} (patience={PATIENCE})")
                break

    # Final evaluation
    print(f"\n📈 Best Val Accuracy: {best_val_acc:.4f} ({best_val_acc*100:.1f}%)")
    report = classification_report(labels, preds, target_names=class_names)
    print(f"\n{report}")
    with open(REPORT_PATH, 'w') as f:
        f.write(f"Best Val Accuracy: {best_val_acc:.4f}\n\n{report}")

    # Save history + plots
    with open(HISTORY_PATH, 'w') as f:
        json.dump(history, f, indent=2)
    plot_history(history)

    print("\n" + "=" * 60)
    print(f"  ✅ Training complete!")
    print(f"  Model:    {MODEL_PATH}")
    print(f"  Accuracy: {best_val_acc*100:.1f}%")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()