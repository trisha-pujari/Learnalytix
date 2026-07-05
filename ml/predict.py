"""
Learnalytix Prediction Utility
Usage: python ml/predict.py
Returns: JSON with dropout_risk and pass_fail predictions
"""

import joblib, json, numpy as np

MODELS_DIR = "ml/models"

def load_models():
    return {
        "dropout":    joblib.load(f"{MODELS_DIR}/dropout_model.pkl"),
        "passfail":   joblib.load(f"{MODELS_DIR}/passfail_model.pkl"),
        "scaler":     joblib.load(f"{MODELS_DIR}/scaler.pkl"),
        "branch_enc": joblib.load(f"{MODELS_DIR}/branch_encoder.pkl"),
        "dr_enc":     joblib.load(f"{MODELS_DIR}/dropout_label_encoder.pkl"),
        "pf_enc":     joblib.load(f"{MODELS_DIR}/passfail_label_encoder.pkl"),
    }

def predict_student(student: dict, models: dict) -> dict:
    """
    student dict keys (fill missing semesters with 0):
      cgpa, overall_att, backlogs, internship (bool), projects, hackathons,
      branch (str), year, s1_sgpa..s4_sgpa, att_s1..att_s4
    """
    branch_enc = models["branch_enc"]
    try:
        branch_code = branch_enc.transform([student["branch"]])[0]
    except ValueError:
        branch_code = 0

    X = np.array([[
        student.get("cgpa", 0),
        student.get("overall_att", 0),
        student.get("backlogs", 0),
        int(student.get("internship", False)),
        student.get("projects", 0),
        student.get("hackathons", 0),
        branch_code,
        student.get("year", 1),
        student.get("s1_sgpa", 0),
        student.get("s2_sgpa", 0),
        student.get("s3_sgpa", 0),
        student.get("s4_sgpa", 0),
        student.get("att_s1", 0),
        student.get("att_s2", 0),
        student.get("att_s3", 0),
        student.get("att_s4", 0),
    ]])

    X_scaled = models["scaler"].transform(X)

    dr_pred   = models["dr_enc"].inverse_transform(models["dropout"].predict(X_scaled))[0]
    dr_proba  = models["dropout"].predict_proba(X_scaled)[0]
    dr_conf   = round(float(dr_proba.max()) * 100, 1)

    pf_pred   = models["pf_enc"].inverse_transform(models["passfail"].predict(X_scaled))[0]
    pf_proba  = models["passfail"].predict_proba(X_scaled)[0]
    pf_conf   = round(float(pf_proba.max()) * 100, 1)

    return {
        "dropout_risk":       dr_pred,
        "dropout_confidence": dr_conf,
        "pass_fail":          pf_pred,
        "passfail_confidence": pf_conf,
    }

if __name__ == "__main__":
    models = load_models()
    sample = {
        "cgpa": 5.2, "overall_att": 62, "backlogs": 2,
        "internship": False, "projects": 1, "hackathons": 0,
        "branch": "CE", "year": 3,
        "s1_sgpa": 5.3, "s2_sgpa": 5.5, "s3_sgpa": 6.2, "s4_sgpa": 3.5,
        "att_s1": 62, "att_s2": 64, "att_s3": 51, "att_s4": 65,
    }
    result = predict_student(sample, models)
    print(json.dumps(result, indent=2))