export default function FormInput({ label, type, value, onChange }) {
  return (
    <div className="mb-3">
      <label className="form-label fw-semibold text-dark">{label}</label>
      <input
        type={type}
        className="form-control"
        style={{
          borderRadius: "14px",
          padding: "12px",
          border: "1px solid var(--tw-border)",
          background: "var(--tw-surface)",
        }}
        value={value}
        onChange={onChange}
        required
      />
    </div>
  );
}
