"""
Learnalytix ML API Server
Run: python ml/app.py
Base URL: http://localhost:5000/api
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import json
import os
import math

app = Flask(__name__)
CORS(app)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

def load_models():
    return {
        "dropout":    joblib.load(f"{MODELS_DIR}/dropout_model.pkl"),
        "passfail":   joblib.load(f"{MODELS_DIR}/passfail_model.pkl"),
        "scaler":     joblib.load(f"{MODELS_DIR}/scaler.pkl"),
        "branch_enc": joblib.load(f"{MODELS_DIR}/branch_encoder.pkl"),
        "dr_enc":     joblib.load(f"{MODELS_DIR}/dropout_label_encoder.pkl"),
        "pf_enc":     joblib.load(f"{MODELS_DIR}/passfail_label_encoder.pkl"),
    }

models = load_models()

with open(f"{MODELS_DIR}/model_meta.json") as f:
    meta = json.load(f)

FEATURES = meta["features"]

# ── Safe type converters ───────────────────────────────────────────────────────
def safe_float(val, default=0.0):
    try:
        v = float(val)
        return default if math.isnan(v) else v
    except:
        return default

def safe_int(val, default=0):
    try:
        v = float(val)
        return default if math.isnan(v) else int(v)
    except:
        return default

def safe_bool(val):
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.lower() in ('true', 'yes', '1')
    return bool(val)

# ── Feature builder ────────────────────────────────────────────────────────────
def build_feature_vector(data: dict) -> pd.DataFrame:
    branch_enc = models["branch_enc"]
    try:
        branch_code = int(branch_enc.transform([data.get("branch", "CE")])[0])
    except ValueError:
        branch_code = 0

    row = {
        "CGPA":           safe_float(data.get("cgpa", 0)),
        "Overall Att%":   safe_float(data.get("overall_att", 0)),
        "Backlogs":       safe_int(data.get("backlogs", 0)),
        "Internship_enc": int(safe_bool(data.get("internship", False))),
        "Projects":       safe_int(data.get("projects", 0)),
        "Hackathons":     safe_int(data.get("hackathons", 0)),
        "Branch_enc":     branch_code,
        "Year":           safe_int(data.get("year", 1)),
        "S1 SGPA":        safe_float(data.get("s1_sgpa", 0)),
        "S2 SGPA":        safe_float(data.get("s2_sgpa", 0)),
        "S3 SGPA":        safe_float(data.get("s3_sgpa", 0)),
        "S4 SGPA":        safe_float(data.get("s4_sgpa", 0)),
        "S5 SGPA":        safe_float(data.get("s5_sgpa", 0)),
        "S6 SGPA":        safe_float(data.get("s6_sgpa", 0)),
        "S7 SGPA":        safe_float(data.get("s7_sgpa", 0)),
        "S8 SGPA":        safe_float(data.get("s8_sgpa", 0)),
        "Att S1%":        safe_float(data.get("att_s1", 0)),
        "Att S2%":        safe_float(data.get("att_s2", 0)),
        "Att S3%":        safe_float(data.get("att_s3", 0)),
        "Att S4%":        safe_float(data.get("att_s4", 0)),
    }

    # Only keep features the model was actually trained on
    row_filtered = {k: v for k, v in row.items() if k in FEATURES}

    # Add any missing features as 0
    for f in FEATURES:
        if f not in row_filtered:
            row_filtered[f] = 0

    return pd.DataFrame([row_filtered], columns=FEATURES)

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "models": {
            "dropout_risk": meta["dropout"],
            "pass_fail":    meta["passfail"],
        }
    })


@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "No JSON body provided"}), 400

    try:
        X_df = build_feature_vector(data)
        X_scaled = models["scaler"].transform(X_df)

        dr_pred    = models["dr_enc"].inverse_transform(models["dropout"].predict(X_scaled))[0]
        dr_proba   = models["dropout"].predict_proba(X_scaled)[0]
        dr_classes = models["dr_enc"].classes_.tolist()
        dr_proba_dict = {c: round(float(p) * 100, 1) for c, p in zip(dr_classes, dr_proba)}

        pf_pred    = models["pf_enc"].inverse_transform(models["passfail"].predict(X_scaled))[0]
        pf_proba   = models["passfail"].predict_proba(X_scaled)[0]
        pf_classes = models["pf_enc"].classes_.tolist()
        pf_proba_dict = {c: round(float(p) * 100, 1) for c, p in zip(pf_classes, pf_proba)}

        return jsonify({
            "dropout_risk":           dr_pred,
            "dropout_confidence":     round(float(dr_proba.max()) * 100, 1),
            "dropout_probabilities":  dr_proba_dict,
            "pass_fail":              pf_pred,
            "passfail_confidence":    round(float(pf_proba.max()) * 100, 1),
            "passfail_probabilities": pf_proba_dict,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/predict/batch", methods=["POST"])
def predict_batch():
    data = request.get_json(force=True)
    students = data.get("students", [])
    if not students:
        return jsonify({"error": "No students provided"}), 400

    results = []
    for s in students:
        try:
            X_df = build_feature_vector(s)
            X_scaled = models["scaler"].transform(X_df)

            dr_pred = models["dr_enc"].inverse_transform(models["dropout"].predict(X_scaled))[0]
            dr_conf = round(float(models["dropout"].predict_proba(X_scaled)[0].max()) * 100, 1)
            pf_pred = models["pf_enc"].inverse_transform(models["passfail"].predict(X_scaled))[0]
            pf_conf = round(float(models["passfail"].predict_proba(X_scaled)[0].max()) * 100, 1)

            results.append({
                "roll_no":             s.get("roll_no", ""),
                "name":                s.get("name", ""),
                "dropout_risk":        dr_pred,
                "dropout_confidence":  dr_conf,
                "pass_fail":           pf_pred,
                "passfail_confidence": pf_conf,
            })
        except Exception as e:
            results.append({"roll_no": s.get("roll_no", ""), "error": str(e)})

    return jsonify({"results": results, "total": len(results)})


@app.route("/api/model/info", methods=["GET"])
def model_info():
    return jsonify({
        "features":           FEATURES,
        "dropout_model":      meta["dropout"],
        "passfail_model":     meta["passfail"],
        "feature_importances": meta["feature_importances"],
    })


if __name__ == "__main__":
    print("Starting Learnalytix ML API on http://localhost:5000")
    app.run(debug=True, port=5000)