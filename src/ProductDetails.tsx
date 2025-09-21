const ProductDetails =({
  id,
  onClose,
}: {
  id: number;
  onClose: () => void;
}) => {
  // Pretend this is heavy (charts, images, etc.) — it’s lazy-loaded
  return (
    <div
      role="dialog"
      aria-modal
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 12,
          minWidth: 360,
        }}
      >
        <h2>Product {id} details</h2>
        <p>
          This modal is code-split with <code>React.lazy</code> so the main list
          loads fast.
        </p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default ProductDetails;
