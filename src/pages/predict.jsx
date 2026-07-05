// src/pages/Predict.jsx
// Form to enter student data and get ML predictions from Flask API

import { useState } from "react";
import { predictStudent } from "../services/mlService";
import "../css/Predict.css";

const BRANCHES = ["CE", "CST", "DS", "IT", "ME", "EE", "EC"];

const initialForm = {
  roll_no: "", name: "", branch: "CE", year: 1,
  cgpa: "", overall_att: "", backlogs: 0, internship: false,
  projects: 0, hackathons: 0,
  s1_sgpa: "", s2_sgpa: "", s3_sgpa: "", s4_sgpa: "",
  att_s1: "", att_s2: "", att_s3: "", att_s4: "",
};

export default function Predict() {
  const [form, setForm]       = useState(initialForm);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const prediction = await predictStudent(form);
      setResult(prediction);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (risk) =>
    ({ High: "#e74c3c", Medium: "#f39c12", Low: "#27ae60" }[risk] || "#888");

  return (
    <div className="predict-page">
      <h2>Student Risk Prediction</h2>
      <p className="subtitle">Enter student academic data to predict dropout risk and pass/fail outcome.</p>

      <form onSubmit={handleSubmit} className="predict-form">

        {/* Basic Info */}
        <section className="form-section">
          <h3>Basic Info</h3>
          <div className="form-row">
            <label>Roll No
              <input value={form.roll_no} onChange={e => set("roll_no", e.target.value)} placeholder="ENG2024001" />
            </label>
            <label>Student Name
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name" />
            </label>
            <label>Branch
              <select value={form.branch} onChange={e => set("branch", e.target.value)}>
                {BRANCHES.map(b => <option key={b}>{b}</option>)}
              </select>
            </label>
            <label>Year
              <select value={form.year} onChange={e => set("year", parseInt(e.target.value))}>
                {[1,2,3,4].map(y => <option key={y}>{y}</option>)}
              </select>
            </label>
          </div>
        </section>

        {/* Academic Performance */}
        <section className="form-section">
          <h3>Academic Performance</h3>
          <div className="form-row">
            <label>CGPA *
              <input type="number" min="0" max="10" step="0.01" required
                value={form.cgpa} onChange={e => set("cgpa", e.target.value)} placeholder="e.g. 7.5" />
            </label>
            <label>Overall Attendance % *
              <input type="number" min="0" max="100" step="0.1" required
                value={form.overall_att} onChange={e => set("overall_att", e.target.value)} placeholder="e.g. 82" />
            </label>
            <label>Backlogs
              <input type="number" min="0" value={form.backlogs}
                onChange={e => set("backlogs", parseInt(e.target.value))} />
            </label>
          </div>

          <div className="form-row">
            {["s1","s2","s3","s4"].map(s => (
              <label key={s}>{s.toUpperCase()} SGPA
                <input type="number" min="0" max="10" step="0.01"
                  value={form[`${s}_sgpa`]}
                  onChange={e => set(`${s}_sgpa`, e.target.value)}
                  placeholder="0 if N/A" />
              </label>
            ))}
          </div>

          <div className="form-row">
            {["s1","s2","s3","s4"].map(s => (
              <label key={s}>Att {s.toUpperCase()} %
                <input type="number" min="0" max="100" step="0.1"
                  value={form[`att_${s}`]}
                  onChange={e => set(`att_${s}`, e.target.value)}
                  placeholder="0 if N/A" />
              </label>
            ))}
          </div>
        </section>

        {/* Extracurricular */}
        <section className="form-section">
          <h3>Extracurricular</h3>
          <div className="form-row">
            <label>Projects
              <input type="number" min="0" value={form.projects}
                onChange={e => set("projects", parseInt(e.target.value))} />
            </label>
            <label>Hackathons
              <input type="number" min="0" value={form.hackathons}
                onChange={e => set("hackathons", parseInt(e.target.value))} />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={form.internship}
                onChange={e => set("internship", e.target.checked)} />
              Has Internship
            </label>
          </div>
        </section>

        {error && <p className="error-msg">{error}</p>}
        <button type="submit" className="predict-btn" disabled={loading}>
          {loading ? "Predicting…" : "Predict"}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="results-card">
          <h3>Prediction Result</h3>
          <div className="results-grid">
            <div className="result-item">
              <span className="result-label">Dropout Risk</span>
              <span className="result-value" style={{ color: riskColor(result.dropout_risk) }}>
                {result.dropout_risk}
              </span>
              <span className="result-conf">{result.dropout_confidence}% confidence</span>
              <div className="proba-bars">
                {Object.entries(result.dropout_probabilities).map(([cls, pct]) => (
                  <div key={cls} className="proba-row">
                    <span>{cls}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%`, background: riskColor(cls) }} />
                    </div>
                    <span>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="result-item">
              <span className="result-label">Pass / Fail</span>
              <span className="result-value" style={{ color: result.pass_fail === "Pass" ? "#27ae60" : "#e74c3c" }}>
                {result.pass_fail}
              </span>
              <span className="result-conf">{result.passfail_confidence}% confidence</span>
              <div className="proba-bars">
                {Object.entries(result.passfail_probabilities).map(([cls, pct]) => (
                  <div key={cls} className="proba-row">
                    <span>{cls}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%`, background: cls === "Pass" ? "#27ae60" : "#e74c3c" }} />
                    </div>
                    <span>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}