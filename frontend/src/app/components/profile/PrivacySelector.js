"use client";

export function PrivacySelector({ value, onChange }) {
  return (
    <div style={{ marginTop: 10 }}>
      <label>
        <strong>Profile Privacy:</strong>
      </label>
      <select value={value} onChange={onChange} style={{ marginLeft: 10 }}>
        <option value={0}>Public</option>
        <option value={1}>Private</option>
      </select>
    </div>
  );
}