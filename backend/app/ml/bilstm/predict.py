# File: backend/app/ml/bilstm/predict.py
#
# Inference module for NexusDesk BiLSTM Complexity Classifier
# Loaded once at FastAPI startup, reused for every ticket.
#
# Usage:
#   from app.ml.bilstm.predict import predict_complexity
#   result = predict_complexity("VPN not working after AWS migration")
#   # returns: {"complexity": "complex", "confidence": 0.89, "scores": {...}}

import os
import pickle
import numpy as np

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

BASE_DIR       = os.path.dirname(__file__)
MODEL_PATH     = os.path.join(BASE_DIR, "data", "bilstm_model.h5")
TOKENIZER_PATH = os.path.join(BASE_DIR, "data", "tokenizer.pkl")

CLASSES   = ['simple', 'moderate', 'complex']
MAX_LEN   = 128

# ── Lazy load — model loaded once on first call ───────────────────────────────
_model     = None
_tokenizer = None


def _load_artifacts():
    global _model, _tokenizer

    if _model is not None:
        return  # already loaded

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"BiLSTM model not found at {MODEL_PATH}. "
            "Run train.py first to train the model."
        )
    if not os.path.exists(TOKENIZER_PATH):
        raise FileNotFoundError(
            f"Tokenizer not found at {TOKENIZER_PATH}. "
            "Run train.py first to train the model."
        )

    import tensorflow as tf
    from tensorflow.keras.models import load_model

    _model = load_model(MODEL_PATH)

    with open(TOKENIZER_PATH, 'rb') as f:
        _tokenizer = pickle.load(f)


def predict_complexity(text: str) -> dict:
    """
    Predict the complexity of an IT support ticket description.

    Args:
        text: Raw ticket description text

    Returns:
        {
            "complexity": "simple" | "moderate" | "complex",
            "confidence": float (0-1),
            "scores": {
                "simple": float,
                "moderate": float,
                "complex": float
            }
        }
    """
    try:
        _load_artifacts()
    except FileNotFoundError:
        # Model not trained yet — return default
        return {
            "complexity": "moderate",
            "confidence": 0.0,
            "scores": {"simple": 0.33, "moderate": 0.34, "complex": 0.33},
            "error": "Model not trained yet"
        }

    from tensorflow.keras.preprocessing.sequence import pad_sequences

    # Preprocess
    sequence = _tokenizer.texts_to_sequences([text.lower().strip()])
    padded   = pad_sequences(sequence, maxlen=MAX_LEN, padding='post', truncating='post')

    # Predict
    probs      = _model.predict(padded, verbose=0)[0]
    class_idx  = int(np.argmax(probs))
    confidence = float(probs[class_idx])

    return {
        "complexity": CLASSES[class_idx],
        "confidence": round(confidence, 4),
        "scores": {
            "simple":   round(float(probs[0]), 4),
            "moderate": round(float(probs[1]), 4),
            "complex":  round(float(probs[2]), 4),
        }
    }


def predict_batch(texts: list) -> list:
    """Predict complexity for multiple tickets at once."""
    try:
        _load_artifacts()
    except FileNotFoundError:
        return [{"complexity": "moderate", "confidence": 0.0} for _ in texts]

    from tensorflow.keras.preprocessing.sequence import pad_sequences

    sequences = _tokenizer.texts_to_sequences([t.lower().strip() for t in texts])
    padded    = pad_sequences(sequences, maxlen=MAX_LEN, padding='post', truncating='post')
    probs     = _model.predict(padded, verbose=0)

    results = []
    for prob in probs:
        class_idx = int(np.argmax(prob))
        results.append({
            "complexity": CLASSES[class_idx],
            "confidence": round(float(prob[class_idx]), 4),
            "scores": {
                "simple":   round(float(prob[0]), 4),
                "moderate": round(float(prob[1]), 4),
                "complex":  round(float(prob[2]), 4),
            }
        })
    return results


if __name__ == "__main__":
    # Quick test
    test_tickets = [
        "My keyboard stopped working",
        "VPN connects but can't reach internal servers for 5 users",
        "Intermittent packet loss on VLAN 30 post-AWS migration affecting entire sales floor of 200 users",
        "Outlook won't open on my laptop",
        "Production database down, all services affected, customers cannot log in",
    ]

    print("\n" + "=" * 60)
    print("  NexusDesk BiLSTM — Inference Test")
    print("=" * 60)

    for ticket in test_tickets:
        result = predict_complexity(ticket)
        print(f"\n  Text:       {ticket[:60]}...")
        print(f"  Complexity: {result['complexity'].upper()} ({result['confidence']*100:.1f}% confidence)")
        print(f"  Scores:     Simple={result['scores']['simple']:.2f} | Moderate={result['scores']['moderate']:.2f} | Complex={result['scores']['complex']:.2f}")

    print("\n" + "=" * 60)