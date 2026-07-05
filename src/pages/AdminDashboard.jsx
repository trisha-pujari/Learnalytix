// src/pages/AdminDashboard.jsx

import { useState, useEffect } from "react";
import "../css/AdminDashboard.css";

const RISK_COLOR = { High: "#e74c3c", Medium: "#f39c12", Low: "#27ae60" };

export default function AdminDashboard() {
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState("");
  const [filter, setFilter]       = useState("All");
  const [search, setSearch]       = useState("");
  const [drAcc, setDrAcc]         = useState(null);
  const [pfAcc, setPfAcc]         = useState(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        // Load students
        const mod = await import("../data/students.json");
        const rawStudents = mod.default;

        // Get model info
        try {
          const infoRes = await fetch("http://localhost:5000/api/model/info");
          const info = await infoRes.json();
          setDrAcc((info.dropout_model?.accuracy * 100).toFixed(1));
          setPfAcc((info.passfail_model?.accuracy * 100).toFixed(1));
        } catch {}

        // Predict in chunks of 50
        const CHUNK = 50;
        const allResults = [];

        for (let i = 0; i < rawStudents.length; i += CHUNK) {
          const chunk = rawStudents.slice(i, i + CHUNK);
          const res = await fetch("http://localhost:5000/api/predict/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ students: chunk }),
          });

          if (!res.ok) throw new Error("API error: " + res.status);
          const data = await res.json();

          const merged = data.results.map((pred, j) => ({
            ...rawStudents[i + j],
            ...pred,
          }));

          allResults.push(...merged);
          setProgress(Math.round(((i + CHUNK) / rawStudents.length) * 100));
          setResults([...allResults]); // show results as they load
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setProgress(100);
      }
    }
    fetchAll();
  }, []);

  const total     = results.length;
  const highRisk  = results.filter(r => r.dropout_risk === "High").length;
  const medRisk   = results.filter(r => r.dropout_risk === "Medium").length;
  const lowRisk   = results.filter(r => r.dropout_risk === "Low").length;
  const failCount = results.filter(r => r.pass_fail === "Fail").length;

  const visible = results.filter(r => {
    const matchRisk   = filter === "All" || r.dropout_risk === filter;
    const matchSearch = r.name?.toLowerCase().includes(search.toLowerCase()) ||
                        r.roll_no?.toLowerCase().includes(search.toLowerCase());
    return matchRisk && matchSearch;
  });

  if (error) return (
    <div className="dash-loading">
      <p style={{ color: "#e74c3c" }}>❌ Error: {error}</p>
      <p style={{ fontSize: "0.8rem", color: "#aaa", marginTop: "8px" }}>
        Make sure Flask is running: <code>python ml/app.py</code>
      </p>
    </div>
  );

  return (
    <div className="admin-dash">

      {/* Loading bar */}
      {loading && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#888", marginBottom: "6px" }}>
            <span>⏳ Loading predictions… {results.length} / 500 students</span>
            <span>{Math.min(progress, 100)}%</span>
          </div>
          <div style={{ background: "#e8e8f0", borderRadius: "6px", height: "8px", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#3d3d8f", borderRadius: "6px", width: `${Math.min(progress, 100)}%`, transition: "width 0.3s ease" }} />
          </div>
        </div>
      )}

      <div className="dash-header">
        <div>
          <h2>Admin Dashboard</h2>
          <p className="dash-sub">
            {loading ? `Loading… ${results.length} students so far` : `Predictions for all ${total} students`}
          </p>
        </div>
        {drAcc && (
          <div className="model-badge">
            <span>Dropout model: <strong>{drAcc}%</strong> acc</span>
            <span>Pass/Fail model: <strong>{pfAcc}%</strong> acc</span>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <StatCard label="Total Students"  value={total}     color="#3d3d8f" />
        <StatCard label="High Risk"       value={highRisk}  color="#e74c3c" />
        <StatCard label="Medium Risk"     value={medRisk}   color="#f39c12" />
        <StatCard label="Low Risk"        value={lowRisk}   color="#27ae60" />
        <StatCard label="Predicted Fail"  value={failCount} color="#8e44ad" />
      </div>

      {/* Bar chart */}
      {total > 0 && (
        <div className="risk-chart">
          <h4>Dropout Risk Distribution</h4>
          <div className="bars">
            {[["High", highRisk, "#e74c3c"], ["Medium", medRisk, "#f39c12"], ["Low", lowRisk, "#27ae60"]].map(([lbl, val, col]) => (
              <div key={lbl} className="bar-group">
                <div className="bar-outer">
                  <div className="bar-inner" style={{ height: `${total > 0 ? (val / total) * 100 : 0}%`, background: col }} />
                </div>
                <span className="bar-label">{lbl}</span>
                <span className="bar-num">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {total > 0 && (
        <div className="table-section">
          <div className="table-controls">
            <input
              className="search-box"
              placeholder="Search by name or roll no…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="filter-tabs">
              {["All","High","Medium","Low"].map(f => (
                <button
                  key={f}
                  className={`filter-tab ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Branch</th>
                  <th>CGPA</th>
                  <th>Att %</th>
                  <th>Backlogs</th>
                  <th>Dropout Risk</th>
                  <th>Confidence</th>
                  <th>Pass / Fail</th>
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, 100).map((s, i) => (
                  <tr key={i}>
                    <td className="mono">{s.roll_no}</td>
                    <td>{s.name}</td>
                    <td>{s.branch}</td>
                    <td>{s.cgpa}</td>
                    <td>{s.overall_att}%</td>
                    <td>{s.backlogs}</td>
                    <td>
                      <span className="risk-pill" style={{
                        background: (RISK_COLOR[s.dropout_risk] || "#888") + "22",
                        color: RISK_COLOR[s.dropout_risk] || "#888"
                      }}>
                        {s.dropout_risk || "—"}
                      </span>
                    </td>
                    <td>{s.dropout_confidence}%</td>
                    <td>
                      <span className={`pf-pill ${s.pass_fail === "Pass" ? "pass" : "fail"}`}>
                        {s.pass_fail || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && <p className="no-data">No students match the filter.</p>}
            {visible.length > 100 && (
              <p className="more-note">Showing 100 of {visible.length} results.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
      <p className="stat-value" style={{ color }}>{value}</p>
      <p className="stat-label">{label}</p>
    </div>
  );
}