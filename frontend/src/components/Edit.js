import React from "react";

const Edit = () => (
  <div
    style={{
      padding: "2rem",
      background: "rgba(255,255,255,0.85)",
      borderRadius: "12px",
      maxWidth: "600px",
      margin: "3rem auto",
    }}
  >
    <h2 style={{ color: "#1a237e" }}>Edit Ship Information</h2>
    <form>
      <div style={{ marginBottom: "1rem" }}>
        <label>Ship Name:</label>
        <input
          type="text"
          placeholder="Enter ship name"
          style={{
            width: "100%",
            padding: "0.5rem",
          }}
        />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label>Schedule:</label>
        <input
          type="text"
          placeholder="Enter schedule"
          style={{
            width: "100%",
            padding: "0.5rem",
          }}
        />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label>Crew Assignment:</label>
        <input
          type="text"
          placeholder="Enter crew assignment"
          style={{
            width: "100%",
            padding: "0.5rem",
          }}
        />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label>Docking Time:</label>
        <input
          type="text"
          placeholder="Enter docking time"
          style={{
            width: "100%",
            padding: "0.5rem",
          }}
        />
      </div>
      <button
        type="submit"
        style={{
          background: "#1a237e",
          color: "#fff",
          padding: "0.75rem 2rem",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Save Changes
      </button>
    </form>
  </div>
);

export default Edit;