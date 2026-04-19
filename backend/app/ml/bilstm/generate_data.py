# File: backend/app/ml/bilstm/generate_data.py
#
# Generates synthetic IT support ticket training data using LLaMA 3 (via Ollama).
# Appends to existing tickets.csv if it already exists.
#
# Run: PYTHONPATH=. python3 app/ml/bilstm/generate_data.py

import requests
import json
import csv
import os
import time

OLLAMA_URL        = "http://localhost:11434/api/generate"
OUTPUT_PATH       = os.path.join(os.path.dirname(__file__), "data", "tickets.csv")
SAMPLES_PER_COMBO = 30   # 12 × 3 × 30 = 1080 new samples per run
BATCH_SIZE        = 3    # small batches — more reliable, less timeout

DOMAINS = [
    "networking",
    "hardware",
    "software",
    "security",
    "email_communication",
    "identity_access",
    "database",
    "cloud",
    "infrastructure",
    "devops",
    "erp_business_apps",
    "endpoint_management",
]

COMPLEXITIES = ["simple", "moderate", "complex"]

COMPLEXITY_RULES = {
    "simple":   "Single user/device affected, obvious fix exists, no production impact.",
    "moderate": "2-10 users affected, multiple symptoms, needs investigation, minor business impact.",
    "complex":  "10+ users or production affected, multiple systems, unclear root cause, needs senior engineer.",
}

SEVERITY_MAP = {
    "simple":   ["low", "medium"],
    "moderate": ["medium", "high"],
    "complex":  ["high", "critical"],
}

TONE_OPTIONS = ["calm", "frustrated", "urgent", "panicked", "confused"]

DOMAIN_CONTEXT = {
    "networking":          "DNS, VPN, WiFi, LAN/WAN, firewall, routing, packet loss, VLAN",
    "hardware":            "laptops, desktops, printers, keyboards, monitors, USB, peripherals",
    "software":            "OS, applications, installations, updates, licenses, crashes, plugins",
    "security":            "malware, phishing, access denied, SSL certificates, breaches, ransomware",
    "email_communication": "Outlook, Gmail, Teams, Zoom, calendar sync, SMTP/IMAP, attachments",
    "identity_access":     "Active Directory, SSO, MFA, account lockouts, LDAP, Okta, role access",
    "database":            "PostgreSQL, MySQL, MongoDB, SQL queries, connection pools, timeouts",
    "cloud":               "AWS, Azure, GCP, S3, EC2, Kubernetes, IAM permissions, billing alerts",
    "infrastructure":      "servers, VMs, storage, backup, hypervisors, data centers, UPS",
    "devops":              "CI/CD pipelines, Jenkins, GitHub Actions, Docker, deployments, builds",
    "erp_business_apps":   "SAP, Salesforce, Oracle ERP, Dynamics 365, ServiceNow, Jira",
    "endpoint_management": "MDM, Intune, Jamf, antivirus, patching, device compliance, BitLocker",
}

ONSITE_DOMAINS = {"hardware", "infrastructure", "endpoint_management"}


def call_llama(prompt: str) -> str:
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model":   "llama3",
                "prompt":  prompt,
                "stream":  False,
                "options": {"temperature": 0.88, "top_p": 0.95},
            },
            timeout=300,
        )
        return response.json().get("response", "")
    except Exception as e:
        print(f"\n    ⚠ Ollama error: {e}")
        return ""


def generate_batch(domain: str, complexity: str, count: int) -> list:
    severity_choices = SEVERITY_MAP[complexity]
    requires_onsite  = "true" if domain in ONSITE_DOMAINS else "false"

    prompt = f"""Generate exactly {count} IT support ticket records as a JSON array.

Domain: {domain.upper().replace('_', ' ')} — {DOMAIN_CONTEXT[domain]}
Complexity: {complexity.upper()} — {COMPLEXITY_RULES[complexity]}

Each record must have these exact keys:
- "text": ticket description as typed by a real user (10-60 words)
- "complexity": "{complexity}"
- "domain": "{domain}"
- "severity": one of {severity_choices}
- "tone": one of {TONE_OPTIONS}
- "resolution_hint": one-line hint for engineer (max 15 words)
- "requires_onsite": "{requires_onsite}"

Make each ticket unique. Mix formal, casual, frustrated writing styles.
Return ONLY valid JSON array. No markdown, no explanation.
[{{"text": "...", "complexity": "...", "domain": "...", "severity": "...", "tone": "...", "resolution_hint": "...", "requires_onsite": "..."}}]"""

    raw = call_llama(prompt)

    try:
        start = raw.find("[")
        end   = raw.rfind("]") + 1
        if start == -1 or end == 0:
            return []
        records = json.loads(raw[start:end])
        valid = []
        for r in records:
            if isinstance(r, dict) and "text" in r and len(r.get("text", "")) > 15:
                valid.append({
                    "text":             r.get("text", "").strip(),
                    "complexity":       complexity,
                    "domain":           domain,
                    "severity":         r.get("severity", severity_choices[0]),
                    "tone":             r.get("tone", "calm"),
                    "resolution_hint":  r.get("resolution_hint", ""),
                    "requires_onsite":  r.get("requires_onsite", requires_onsite),
                })
        return valid
    except json.JSONDecodeError:
        return []


def generate_combo(domain: str, complexity: str, target: int) -> list:
    all_records  = []
    attempts     = 0
    max_attempts = 12

    while len(all_records) < target and attempts < max_attempts:
        needed  = target - len(all_records)
        batch   = min(BATCH_SIZE, needed)
        records = generate_batch(domain, complexity, batch)
        all_records.extend(records)
        attempts += 1
        if records:
            time.sleep(0.5)
        else:
            time.sleep(2)  # wait longer on failure

    return all_records[:target]


def count_existing() -> int:
    if not os.path.exists(OUTPUT_PATH):
        return 0
    with open(OUTPUT_PATH, 'r', encoding='utf-8') as f:
        return sum(1 for _ in f) - 1  # minus header


def main():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    existing_count  = count_existing()
    total_combos    = len(DOMAINS) * len(COMPLEXITIES)
    current         = 0
    total_generated = 0

    print("=" * 60)
    print("  NexusDesk BiLSTM Training Data Generator")
    print("=" * 60)
    print(f"  Existing samples : {existing_count}")
    print(f"  Domains          : {len(DOMAINS)}")
    print(f"  Complexities     : {len(COMPLEXITIES)}")
    print(f"  Per combo        : {SAMPLES_PER_COMBO}")
    print(f"  New target       : +{total_combos * SAMPLES_PER_COMBO}")
    print(f"  Total after run  : ~{existing_count + total_combos * SAMPLES_PER_COMBO}")
    print(f"  Output           : {OUTPUT_PATH}")
    print("=" * 60)
    print()

    fieldnames  = ["text", "complexity", "domain", "severity", "tone", "resolution_hint", "requires_onsite"]
    file_exists = os.path.exists(OUTPUT_PATH)

    # Append mode — preserves existing data
    with open(OUTPUT_PATH, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)

        # Write header only if file is new
        if not file_exists or existing_count == 0:
            writer.writeheader()

        for domain in DOMAINS:
            for complexity in COMPLEXITIES:
                current += 1
                print(f"[{current:02d}/{total_combos}] {domain:25s} × {complexity:10s} ... ", end='', flush=True)

                records = generate_combo(domain, complexity, SAMPLES_PER_COMBO)
                writer.writerows(records)
                f.flush()

                total_generated += len(records)
                status = "✓" if len(records) >= SAMPLES_PER_COMBO * 0.8 else "⚠ partial"
                print(f"{status} {len(records)} samples  (total: {existing_count + total_generated})")

                time.sleep(1)

    final_count = count_existing()
    print()
    print("=" * 60)
    print(f"  ✅ Done!")
    print(f"  New samples added : {total_generated}")
    print(f"  Total in CSV      : {final_count}")
    print(f"  Output            : {OUTPUT_PATH}")
    print("=" * 60)
    print()
    print("  Now run: PYTHONPATH=. python3 app/ml/bilstm/train.py")


if __name__ == "__main__":
    main()