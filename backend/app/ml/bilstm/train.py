# File: backend/app/ml/bilstm/train.py
#
# Training pipeline for NexusDesk BiLSTM Complexity Classifier
#
# Steps:
#   1. Load and clean tickets.csv
#   2. Tokenize text + build vocabulary
#   3. Pad sequences to fixed length
#   4. Encode labels (simple=0, moderate=1, complex=2)
#   5. Split into train/validation sets (80/20)
#   6. Train BiLSTM with callbacks (EarlyStopping, ReduceLROnPlateau, Checkpoint)
#   7. Evaluate on validation set
#   8. Save model + tokenizer
#
# Run: python app/ml/bilstm/train.py

import os
import json
import pickle
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # non-interactive backend for saving plots
import matplotlib.pyplot as plt

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import tensorflow as tf
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.callbacks import (
    EarlyStopping, ReduceLROnPlateau,
    ModelCheckpoint, CSVLogger,
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns

from app.ml.bilstm.model import build_model, Config, print_summary

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR       = os.path.dirname(__file__)
DATA_PATH      = os.path.join(BASE_DIR, "data", "tickets.csv")
MODEL_PATH     = os.path.join(BASE_DIR, "data", "bilstm_model.h5")
TOKENIZER_PATH = os.path.join(BASE_DIR, "data", "tokenizer.pkl")
HISTORY_PATH   = os.path.join(BASE_DIR, "data", "training_history.json")
PLOT_PATH      = os.path.join(BASE_DIR, "data", "training_curves.png")
REPORT_PATH    = os.path.join(BASE_DIR, "data", "classification_report.txt")
LOG_PATH       = os.path.join(BASE_DIR, "data", "training_log.csv")

# ── Label mapping ─────────────────────────────────────────────────────────────
LABEL_MAP     = {'simple': 0, 'moderate': 1, 'complex': 2}
LABEL_NAMES   = ['Simple', 'Moderate', 'Complex']


# ── 1. Load & clean data ──────────────────────────────────────────────────────

def load_data(path: str) -> pd.DataFrame:
    print("📂 Loading data...")
    df = pd.read_csv(path)
    print(f"   Loaded {len(df)} rows")

    # Drop rows with missing text or complexity
    df = df.dropna(subset=['text', 'complexity'])
    df['text']       = df['text'].astype(str).str.strip()
    df['complexity'] = df['complexity'].str.strip().str.lower()

    # Keep only valid complexity labels
    df = df[df['complexity'].isin(LABEL_MAP.keys())]
    df = df[df['text'].str.len() > 10]  # remove very short texts

    print(f"   After cleaning: {len(df)} rows")
    print(f"\n   Class distribution:")
    for label, count in df['complexity'].value_counts().items():
        pct = count / len(df) * 100
        print(f"   {label:10s}: {count:4d} ({pct:.1f}%)")

    return df


# ── 2. Tokenize & pad ─────────────────────────────────────────────────────────

def prepare_sequences(texts: list, config: Config, fit: bool = True, tokenizer=None):
    if fit:
        tokenizer = Tokenizer(
            num_words=config.VOCAB_SIZE,
            oov_token=config.OOV_TOKEN,
            lower=True,
            filters='!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~\t\n',
        )
        tokenizer.fit_on_texts(texts)
        vocab_size = min(len(tokenizer.word_index) + 1, config.VOCAB_SIZE)
        print(f"\n📖 Vocabulary: {len(tokenizer.word_index):,} unique words → using top {vocab_size:,}")

    sequences = tokenizer.texts_to_sequences(texts)
    padded    = pad_sequences(
        sequences,
        maxlen=config.MAX_LEN,
        padding='post',
        truncating='post',
    )
    return padded, tokenizer


# ── 3. Encode labels ──────────────────────────────────────────────────────────

def encode_labels(labels: pd.Series) -> np.ndarray:
    return np.array([LABEL_MAP[l] for l in labels])


# ── 4. Callbacks ──────────────────────────────────────────────────────────────

def get_callbacks(config: Config) -> list:
    return [
        # Stop training if val_loss doesn't improve for 5 epochs
        EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True,
            verbose=1,
        ),
        # Reduce learning rate when val_loss plateaus
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-6,
            verbose=1,
        ),
        # Save best model checkpoint
        ModelCheckpoint(
            filepath=MODEL_PATH,
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1,
        ),
        # Log metrics to CSV
        CSVLogger(LOG_PATH, append=False),
    ]


# ── 5. Plot training curves ───────────────────────────────────────────────────

def plot_history(history: dict) -> None:
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle('NexusDesk BiLSTM — Training Curves', fontsize=14, fontweight='bold')

    # Accuracy
    axes[0].plot(history['accuracy'],     label='Train Accuracy', color='#174D38', linewidth=2)
    axes[0].plot(history['val_accuracy'], label='Val Accuracy',   color='#4d9e78', linewidth=2, linestyle='--')
    axes[0].set_title('Accuracy')
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Accuracy')
    axes[0].legend()
    axes[0].grid(alpha=0.3)
    axes[0].set_ylim([0, 1])

    # Loss
    axes[1].plot(history['loss'],     label='Train Loss', color='#4D1717', linewidth=2)
    axes[1].plot(history['val_loss'], label='Val Loss',   color='#a04040', linewidth=2, linestyle='--')
    axes[1].set_title('Loss')
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('Loss')
    axes[1].legend()
    axes[1].grid(alpha=0.3)

    plt.tight_layout()
    plt.savefig(PLOT_PATH, dpi=150, bbox_inches='tight')
    print(f"   Plot saved: {PLOT_PATH}")


# ── 6. Confusion matrix ───────────────────────────────────────────────────────

def plot_confusion_matrix(y_true, y_pred) -> None:
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm, annot=True, fmt='d',
        xticklabels=LABEL_NAMES,
        yticklabels=LABEL_NAMES,
        cmap='Greens',
    )
    plt.title('NexusDesk BiLSTM — Confusion Matrix', fontweight='bold')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    cm_path = os.path.join(BASE_DIR, "data", "confusion_matrix.png")
    plt.savefig(cm_path, dpi=150, bbox_inches='tight')
    print(f"   Confusion matrix saved: {cm_path}")


# ── Main training pipeline ────────────────────────────────────────────────────

def main():
    print("\n" + "=" * 60)
    print("  NexusDesk BiLSTM — Training Pipeline")
    print("=" * 60 + "\n")

    # Set random seeds for reproducibility
    np.random.seed(42)
    tf.random.set_seed(42)

    config = Config()

    # ── Load data ──────────────────────────────────────────────────────────────
    df = load_data(DATA_PATH)

    texts  = df['text'].tolist()
    labels = encode_labels(df['complexity'])

    # ── Train/val split ────────────────────────────────────────────────────────
    X_train_text, X_val_text, y_train, y_val = train_test_split(
        texts, labels,
        test_size=0.20,
        random_state=42,
        stratify=labels,   # preserve class distribution in both splits
    )

    print(f"\n📊 Split:")
    print(f"   Train: {len(X_train_text)} samples")
    print(f"   Val:   {len(X_val_text)} samples")

    # ── Tokenize ───────────────────────────────────────────────────────────────
    print("\n🔤 Tokenizing...")
    X_train, tokenizer = prepare_sequences(X_train_text, config, fit=True)
    X_val,   _         = prepare_sequences(X_val_text, config, fit=False, tokenizer=tokenizer)

    print(f"   Sequence shape (train): {X_train.shape}")
    print(f"   Sequence shape (val):   {X_val.shape}")

    # ── Build model ────────────────────────────────────────────────────────────
    print("\n🏗  Building model...")
    model = build_model(config)
    print_summary(model)

    # ── Class weights (handle imbalance) ───────────────────────────────────────
    from sklearn.utils.class_weight import compute_class_weight
    class_weights = compute_class_weight(
        class_weight='balanced',
        classes=np.unique(y_train),
        y=y_train,
    )
    class_weight_dict = dict(enumerate(class_weights))
    print(f"\n⚖️  Class weights: {class_weight_dict}")

    # ── Train ──────────────────────────────────────────────────────────────────
    print("\n🚀 Training...\n")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=30,
        batch_size=32,
        class_weight=class_weight_dict,
        callbacks=get_callbacks(config),
        verbose=1,
    )

    # ── Evaluate ───────────────────────────────────────────────────────────────
    print("\n📈 Evaluation on validation set:")
    val_loss, val_acc = model.evaluate(X_val, y_val, verbose=0)
    print(f"   Val Loss:     {val_loss:.4f}")
    print(f"   Val Accuracy: {val_acc:.4f} ({val_acc * 100:.1f}%)")

    y_pred = np.argmax(model.predict(X_val, verbose=0), axis=1)
    report = classification_report(y_val, y_pred, target_names=LABEL_NAMES)
    print(f"\n{report}")

    with open(REPORT_PATH, 'w') as f:
        f.write(f"Val Loss: {val_loss:.4f}\nVal Accuracy: {val_acc:.4f}\n\n")
        f.write(report)

    # ── Save artifacts ─────────────────────────────────────────────────────────
    print("\n💾 Saving artifacts...")

    # Tokenizer
    with open(TOKENIZER_PATH, 'wb') as f:
        pickle.dump(tokenizer, f)
    print(f"   Tokenizer saved: {TOKENIZER_PATH}")

    # Training history
    with open(HISTORY_PATH, 'w') as f:
        json.dump(history.history, f, indent=2)
    print(f"   History saved:   {HISTORY_PATH}")

    # Plots
    print("\n📊 Generating plots...")
    plot_history(history.history)
    plot_confusion_matrix(y_val, y_pred)

    print("\n" + "=" * 60)
    print(f"  ✅ Training complete!")
    print(f"  Model:     {MODEL_PATH}")
    print(f"  Tokenizer: {TOKENIZER_PATH}")
    print(f"  Accuracy:  {val_acc * 100:.1f}%")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()