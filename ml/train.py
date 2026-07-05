"""
Learnalytix ML Training Script
Run: python ml/train.py
Outputs: ml/models/*.pkl + ml/models/model_meta.json
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score
import joblib, json, os

DATA_PATH   = "ml/data/learnalytix_500_students_with_result.csv"
MODELS_DIR  = "ml/models"
os.makedirs(MODELS_DIR, exist_ok=True)

# ── Load ───────────────────────────────────────────────────────────────────────
df = pd.read_csv(DATA_PATH)

# ── Feature Engineering ────────────────────────────────────────────────────────
sgpa_cols = [f"S{i} SGPA" for i in range(1,9)]
att_cols  = [f"Att S{i}%" for i in range(1,5)]
df[sgpa_cols] = df[sgpa_cols].fillna(0)
df[att_cols]  = df[att_cols].fillna(0)
df["Internship_enc"] = (df["Internship"] == "Yes").astype(int)

branch_enc = LabelEncoder()
df["Branch_enc"] = branch_enc.fit_transform(df["Branch"])

FEATURES = ["CGPA","Overall Att%","Backlogs","Internship_enc","Projects",
            "Hackathons","Branch_enc","Year",
            "S1 SGPA","S2 SGPA","S3 SGPA","S4 SGPA",
            "Att S1%","Att S2%","Att S3%","Att S4%"]

X = df[FEATURES]
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# ── Target 1: Dropout Risk ─────────────────────────────────────────────────────
dr_enc = LabelEncoder()
y_dr = dr_enc.fit_transform(df["Dropout Risk"])
X_tr, X_te, y_tr, y_te = train_test_split(X_scaled, y_dr, test_size=0.2,
                                            random_state=42, stratify=y_dr)
dr_model = RandomForestClassifier(n_estimators=200, max_depth=10,
                                   random_state=42, class_weight="balanced")
dr_model.fit(X_tr, y_tr)
dr_acc = accuracy_score(y_te, dr_model.predict(X_te))
dr_cv  = cross_val_score(dr_model, X_scaled, y_dr, cv=5).mean()
print(f"[Dropout Risk]  Test Acc: {dr_acc:.4f} | CV Acc: {dr_cv:.4f}")
print(classification_report(y_te, dr_model.predict(X_te), target_names=dr_enc.classes_))

# ── Target 2: Pass / Fail ──────────────────────────────────────────────────────
pf_enc = LabelEncoder()
y_pf = pf_enc.fit_transform(df["Pass/Fail"])
X_tr2, X_te2, y_tr2, y_te2 = train_test_split(X_scaled, y_pf, test_size=0.2,
                                                random_state=42, stratify=y_pf)
pf_model = GradientBoostingClassifier(n_estimators=200, max_depth=5, random_state=42)
pf_model.fit(X_tr2, y_tr2)
pf_acc = accuracy_score(y_te2, pf_model.predict(X_te2))
pf_cv  = cross_val_score(pf_model, X_scaled, y_pf, cv=5).mean()
print(f"[Pass/Fail]     Test Acc: {pf_acc:.4f} | CV Acc: {pf_cv:.4f}")
print(classification_report(y_te2, pf_model.predict(X_te2), target_names=pf_enc.classes_))

# ── Save ───────────────────────────────────────────────────────────────────────
joblib.dump(dr_model,  f"{MODELS_DIR}/dropout_model.pkl")
joblib.dump(pf_model,  f"{MODELS_DIR}/passfail_model.pkl")
joblib.dump(scaler,    f"{MODELS_DIR}/scaler.pkl")
joblib.dump(branch_enc,f"{MODELS_DIR}/branch_encoder.pkl")
joblib.dump(dr_enc,    f"{MODELS_DIR}/dropout_label_encoder.pkl")
joblib.dump(pf_enc,    f"{MODELS_DIR}/passfail_label_encoder.pkl")

fi = dict(zip(FEATURES, dr_model.feature_importances_.tolist()))
meta = {
  "features": FEATURES,
  "dropout": {"type": "RandomForest", "accuracy": round(dr_acc,4), "cv": round(dr_cv,4), "classes": dr_enc.classes_.tolist()},
  "passfail": {"type": "GradientBoosting", "accuracy": round(pf_acc,4), "cv": round(pf_cv,4), "classes": pf_enc.classes_.tolist()},
  "feature_importances": dict(sorted(fi.items(), key=lambda x: x[1], reverse=True))
}
with open(f"{MODELS_DIR}/model_meta.json","w") as f:
    json.dump(meta, f, indent=2)

print("\n✅ Models saved to", MODELS_DIR)