// src/services/mlService.js
// Calls the Flask ML API from React

const BASE_URL = "http://localhost:5000/api";

/**
 * Predict dropout risk and pass/fail for ONE student.
 * @param {Object} studentData - student feature object
 * @returns {Promise<Object>} prediction result
 */
export async function predictStudent(studentData) {
  const res = await fetch(`${BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(studentData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Prediction failed");
  }
  return res.json();
}

/**
 * Batch predict for multiple students.
 * @param {Array} students - array of student feature objects
 * @returns {Promise<Object>} { results: [...], total: N }
 */
export async function predictBatch(students) {
  const res = await fetch(`${BASE_URL}/predict/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ students }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Batch prediction failed");
  }
  return res.json();
}

/**
 * Fetch model metadata (accuracy, features, importances).
 * @returns {Promise<Object>}
 */
export async function getModelInfo() {
  const res = await fetch(`${BASE_URL}/model/info`);
  if (!res.ok) throw new Error("Failed to fetch model info");
  return res.json();
}

/**
 * Health check — returns true if Flask API is running.
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}