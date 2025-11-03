import { useState, useMemo, useCallback } from "react";
import axios from "axios";

const fieldNames = [
  "Hours_Studied","Attendance","Parental_Involvement","Access_to_Resources",
  "Extracurricular_Activities","Sleep_Hours","Previous_Scores","Motivation_Level",
  "Internet_Access","Tutoring_Sessions","Family_Income","Teacher_Quality",
  "School_Type","Peer_Influence","Physical_Activity","Learning_Disabilities",
  "Parental_Education_Level","Distance_from_Home","Gender"
];

export default function App() {
  // memoize initial so it’s not rebuilt on every render
  const initial = useMemo(() => Object.fromEntries(fieldNames.map(f => [f, ""])), []);
  const [form, setForm] = useState(initial);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const numKeys = new Set([
    "Hours_Studied","Attendance","Sleep_Hours","Previous_Scores",
    "Tutoring_Sessions","Physical_Activity"
  ]);

  // useCallback prevents new function instances each render
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const payload = { features: { ...form } };
    for (const k of numKeys) payload.features[k] = Number(form[k]);
    try {
      const base = import.meta.env.VITE_API_BASE;
      const { data } = await axios.post(`${base}/predict`, payload);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || String(err));
      setResult(null);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h2>Student Performance Predictor</h2>
      <form onSubmit={submit}>
        {fieldNames.map((name) => (
          <div key={name} style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 14 }}>{name}</label>
            <input
              type={numKeys.has(name) ? "number" : "text"}
              name={name}
              value={form[name]}
              onChange={handleChange}
              style={{ padding: 8, width: "100%" }}
              placeholder={numKeys.has(name) ? "number" : "text"}
            />
          </div>
        ))}
        <button type="submit" style={{ padding: "10px 16px" }}>Predict</button>
      </form>

      {error && <pre style={{ color: "crimson" }}>{error}</pre>}
      {result && (
        <div style={{ marginTop: 16 }}>
          <div>Prediction: {result.prediction === 1 ? "Pass" : "Fail"}</div>
          <div>Probability (pass): {result.probability_pass.toFixed(3)}</div>
        </div>
      )}
    </div>
  );
}
