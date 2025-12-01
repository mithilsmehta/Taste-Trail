export default function FormInput({ label, type, value, onChange }) {
  return (
    <div className="mb-3">
      <label className="form-label fw-semibold text-dark">{label}</label>
      <input
        type={type}
        className="form-control"
        style={{
          borderRadius: "12px",
          padding: "12px",
          border: "2px solid #ffb84d",
          background: "white",
        }}
        value={value}
        onChange={onChange}
        required
      />
    </div>
  );
}