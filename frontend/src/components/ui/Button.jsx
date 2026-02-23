export function Button({ children, ...props }) {
  return (
    <button
      {...props}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #ddd",
        background: "white",
        cursor: "pointer"
      }}
    >
      {children}
    </button>
  );
}

