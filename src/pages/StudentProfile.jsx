// src/pages/StudentProfile.jsx
// Full profile page for a single student — navigated to from StudentLookup

import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../css/StudentProfile.css";

const RISK_COLOR = { High: "#e74c3c", Medium: "#f39c12", Low: "#27ae60" };
const RISK_BG    = { High: "#fff0ef", Medium: "#fffbef", Low: "#effff5" };

function GaugeRing({ pct = 0, color = "#3d3d8f", size = 88 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8e8f0" strokeWidth="8" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dasharray 0.7s ease" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        fontSize="14" fontWeight="600" fill={color}>
        {pct}%
      </text>
    </svg>
  );
}

function SemesterChart({ sgpas = [], atts = [] }) {
  const maxSGPA = 10;
  const labels = ["S1", "S2", "S3", "S4"];
  const validSGPA = sgpas.filter(v => v > 0);
  const validAtt  = atts.filter(v => v > 0);
  if (!validSGPA.length && !validAtt.length) return null;

  return (
    <div className="sp-sem-chart">
      <h4>Semester Breakdown</h4>
      <div className="sp-sem-bars">
        {labels.map((lbl, i) => {
          const sgpa = parseFloat(sgpas[i]) || 0;
          const att  = parseFloat(atts[i]) || 0;
          return (
            <div key={lbl} className="sp-sem-col">
              <div className="sp-sem-pair">
                {/* SGPA bar */}
                <div className="sp-bar-track" title={`SGPA: ${sgpa}`}>
                  <div
                    className="sp-bar-fill sgpa"
                    style={{ height: `${(sgpa / maxSGPA) * 100}%` }}
                  />
                </div>
                {/* Attendance bar */}
                <div className="sp-bar-track" title={`Attendance: ${att}%`}>
                  <div
                    className="sp-bar-fill att"
                    style={{
                      height: `${att}%`,
                      background: att < 75 ? "#e74c3c" : "#3d3d8f"
                    }}
                  />
                </div>
              </div>
              <span className="sp-sem-label">{lbl}</span>
              <div className="sp-sem-vals">
                {sgpa > 0 && <span className="sp-sgpa-val">{sgpa}</span>}
                {att  > 0 && <span className="sp-att-val">{att}%</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="sp-sem-legend">
        <span><span className="legend-dot sgpa" />SGPA</span>
        <span><span className="legend-dot att" />Attendance</span>
      </div>
    </div>
  );
}

export default function StudentProfile() {
  const { rollNo }   = useParams();
  const location     = useLocation();
  const navigate     = useNavigate();
  const [student, setStudent] = useState(location.state?.student || null);
  const [loading, setLoading] = useState(!student);
  const [error, setError]     = useState("");

  // If navigated directly (no state), load from file
  useEffect(() => {
    if (student) return;
    async function load() {
      try {
        let raw;
        try {
          const mod = await import("../data/students.json");
          raw = mod.default;
        } catch {
          const res = await fetch("/students.json");
          raw = await res.json();
        }
        const found = raw.find(s => s.roll_no === rollNo);
        if (!found) throw new Error(`No student with roll number "${rollNo}"`);

        // Try to enrich with prediction
        try {
          const res = await fetch("http://localhost:5000/api/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(found),
          });
          if (res.ok) {
            const pred = await res.json();
            setStudent({ ...found, ...pred });
            return;
          }
        } catch {}
        setStudent(found);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [rollNo]);

  if (loading) return (
    <div className="sp-loading"><div className="sp-spinner" /><p>Loading profile…</p></div>
  );
  if (error) return (
    <div className="sp-error">
      <p>⚠ {error}</p>
      <button onClick={() => navigate("/students")}>← Back to Lookup</button>
    </div>
  );
  if (!student) return null;

  const s = student;
  const risk        = s.dropout_risk || "—";
  const riskColor   = RISK_COLOR[risk] || "#888";
  const riskBg      = RISK_BG[risk]    || "#f5f5f5";
  const drConf      = s.dropout_confidence    || 0;
  const pfConf      = s.passfail_confidence   || 0;

  const sgpas = [s.s1_sgpa, s.s2_sgpa, s.s3_sgpa, s.s4_sgpa].map(v => parseFloat(v) || 0);
  const atts  = [s.att_s1, s.att_s2, s.att_s3, s.att_s4].map(v => parseFloat(v) || 0);

  // Flags
  const flags = [];
  if (parseFloat(s.cgpa) < 5)           flags.push({ msg: "CGPA below 5.0", level: "high" });
  if (parseFloat(s.overall_att) < 75)   flags.push({ msg: "Attendance below 75%", level: "high" });
  if (parseInt(s.backlogs) > 2)         flags.push({ msg: `${s.backlogs} active backlogs`, level: "high" });
  else if (parseInt(s.backlogs) > 0)    flags.push({ msg: `${s.backlogs} backlog(s)`, level: "medium" });
  if (parseFloat(s.cgpa) < 7 && parseFloat(s.cgpa) >= 5) flags.push({ msg: "CGPA below 7.0", level: "medium" });
  if (parseFloat(s.overall_att) < 85 && parseFloat(s.overall_att) >= 75)
    flags.push({ msg: "Attendance below 85%", level: "low" });

  return (
    <div className="sp-page">

      {/* Back */}
      <button className="sp-back" onClick={() => navigate("/students")}>
        ← Back to Lookup
      </button>

      {/* ── Hero ── */}
      <div className="sp-hero" style={{ "--risk-color": riskColor }}>
        <div className="sp-avatar">{s.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</div>
        <div className="sp-hero-info">
          <h2>{s.name}</h2>
          <p className="sp-meta">
            <span>{s.roll_no}</span>
            <span className="sp-dot">·</span>
            <span>{s.branch}</span>
            <span className="sp-dot">·</span>
            <span>Year {s.year}</span>
          </p>
        </div>
        <div className="sp-risk-badge" style={{ background: riskBg, color: riskColor, borderColor: riskColor + "44" }}>
          <span className="sp-risk-label">Dropout Risk</span>
          <span className="sp-risk-val">{risk}</span>
          <span className="sp-risk-conf">{drConf}% confidence</span>
        </div>
      </div>

      {/* ── Flags ── */}
      {flags.length > 0 && (
        <div className="sp-flags">
          {flags.map((f, i) => (
            <div key={i} className={`sp-flag sp-flag-${f.level}`}>
              <span className="sp-flag-icon">{f.level === "high" ? "⚠" : "ℹ"}</span>
              {f.msg}
            </div>
          ))}
        </div>
      )}

      <div className="sp-body">

        {/* ── Left column ── */}
        <div className="sp-col">

          {/* Academic snapshot */}
          <div className="sp-card">
            <h3>Academic Snapshot</h3>
            <div className="sp-gauges">
              <div className="sp-gauge-item">
                <GaugeRing pct={Math.round((parseFloat(s.cgpa) / 10) * 100)} color="#3d3d8f" />
                <span>CGPA {s.cgpa}</span>
              </div>
              <div className="sp-gauge-item">
                <GaugeRing
                  pct={Math.round(parseFloat(s.overall_att) || 0)}
                  color={parseFloat(s.overall_att) < 75 ? "#e74c3c" : "#27ae60"}
                />
                <span>Attendance</span>
              </div>
            </div>
            <div className="sp-kv-grid">
              <div className="sp-kv"><span>Backlogs</span><strong className={s.backlogs > 0 ? "warn" : ""}>{s.backlogs}</strong></div>
              <div className="sp-kv"><span>Internship</span><strong>{s.internship ? "Yes" : "No"}</strong></div>
              <div className="sp-kv"><span>Projects</span><strong>{s.projects ?? "—"}</strong></div>
              <div className="sp-kv"><span>Hackathons</span><strong>{s.hackathons ?? "—"}</strong></div>
            </div>
          </div>

          {/* Semester chart */}
          <div className="sp-card">
            <SemesterChart sgpas={sgpas} atts={atts} />
          </div>

        </div>

        {/* ── Right column ── */}
        <div className="sp-col">

          {/* Predictions */}
          <div className="sp-card sp-pred-card">
            <h3>ML Predictions</h3>

            {/* Dropout risk */}
            <div className="sp-pred-block">
              <div className="sp-pred-header">
                <span>Dropout Risk</span>
                <span className="sp-pill" style={{ color: riskColor, background: riskBg }}>{risk}</span>
              </div>
              <div className="sp-conf-row">
                <div className="sp-conf-track">
                  <div className="sp-conf-fill" style={{ width: `${drConf}%`, background: riskColor }} />
                </div>
                <span>{drConf}%</span>
              </div>
              {s.dropout_probabilities && (
                <div className="sp-proba">
                  {Object.entries(s.dropout_probabilities).map(([cls, pct]) => (
                    <div key={cls} className="sp-proba-row">
                      <span className="sp-proba-lbl">{cls}</span>
                      <div className="sp-proba-track">
                        <div className="sp-proba-fill" style={{ width: `${pct}%`, background: RISK_COLOR[cls] || "#888" }} />
                      </div>
                      <span className="sp-proba-pct">{pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pass / Fail */}
            <div className="sp-pred-block">
              <div className="sp-pred-header">
                <span>Pass / Fail Prediction</span>
                <span className={`sp-pf-pill ${s.pass_fail === "Pass" ? "pass" : "fail"}`}>
                  {s.pass_fail || "—"}
                </span>
              </div>
              <div className="sp-conf-row">
                <div className="sp-conf-track">
                  <div className="sp-conf-fill"
                    style={{ width: `${pfConf}%`, background: s.pass_fail === "Pass" ? "#27ae60" : "#e74c3c" }} />
                </div>
                <span>{pfConf}%</span>
              </div>
              {s.passfail_probabilities && (
                <div className="sp-proba">
                  {Object.entries(s.passfail_probabilities).map(([cls, pct]) => (
                    <div key={cls} className="sp-proba-row">
                      <span className="sp-proba-lbl">{cls}</span>
                      <div className="sp-proba-track">
                        <div className="sp-proba-fill"
                          style={{ width: `${pct}%`, background: cls === "Pass" ? "#27ae60" : "#e74c3c" }} />
                      </div>
                      <span className="sp-proba-pct">{pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Raw data card */}
          <div className="sp-card">
            <h3>All Fields</h3>
            <div className="sp-raw-grid">
              {Object.entries(s)
                .filter(([k]) => !["dropout_probabilities", "passfail_probabilities"].includes(k))
                .map(([k, v]) => (
                  <div key={k} className="sp-raw-row">
                    <span className="sp-raw-key">{k.replace(/_/g, " ")}</span>
                    <span className="sp-raw-val">{String(v ?? "—")}</span>
                  </div>
                ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}