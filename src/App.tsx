import { useState } from "react";
import ProductDetails from "./ProductDetails";

type Item = { id: number; name: string; price: number; category: string };
const CATEGORIES = ["Hardware", "Software", "Books", "Accessories"];

// --- Data factory (10k rows) ---
const createItems = (n = 10_000): Item[] => {
  const rand = (min: number, max: number) =>
    Math.round(Math.random() * (max - min) + min);
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `Product ${i + 1} · ${Math.random().toString(36).slice(2, 8)}`,
    price: rand(5, 500),
    category: CATEGORIES[i % CATEGORIES.length],
  }));
};

// --- Naïve row: always re-renders when parent changes ---
const NaiveRow = ({
  item,
  isFavorite,
  onToggle,
  onOpen,
}: {
  item: Item;
  isFavorite: boolean;
  onToggle: (id: number) => void;
  onOpen: (id: number) => void;
}) => {
  // pretend-expensive derived calculation done on every render
  const cents = Array.from({ length: 500 }).reduce(
    (acc: number) => acc + item.price,
    0
  ); // silly CPU work
  const handleOpen = () => onOpen(item.id);
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: 6,
        borderBottom: "1px solid #eee",
        justifyContent: "space-between",
      }}
      onClick={handleOpen}
    >
      <strong>{item.name}</strong>
      <span>£{item.price}</span>
      <span>{item.category}</span>
      <button onClick={() => onToggle(item.id)}>
        {isFavorite ? "★" : "☆"}
      </button>
      {/* use the derived var to keep TS happy so it isn’t DCE’d */}
      <span style={{ opacity: 0.3, fontSize: 12 }}>calc:{cents % 7}</span>
    </div>
  );
};

const App = () => {
  // shared dataset
  const [items] = useState(() => createItems());
  const [favorites, setFavorites] = useState<Set<number>>(() => new Set());
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price">("name");
  const [showDetailsFor, setShowDetailsFor] = useState<number | null>(null);

  // NAÏVE: state handlers that change every render
  const naiveToggle = (id: number) => {
    const next = new Set(favorites);
    next.has(id) ? next.delete(id) : next.add(id);
    setFavorites(next);
  };

  // NAÏVE: synchronous state update blocks UI during expensive sort
  const changeSort = (key: "name" | "price") => {
    setSortBy(key);
  };

  // NAÏVE: filtered + sorted computed inline = re-runs every keypress + renders huge list each time
  const naiveList = items
    .filter((it) => it.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortBy === "name" ? a.name.localeCompare(b.name) : a.price - b.price
    );

  const total = naiveList.reduce((acc, item) => acc + item.price, 0);
  return (
    <div
      style={{
        maxWidth: 920,
        margin: "40px auto",
        fontFamily: "ui-sans-serif, system-ui",
      }}
    >
      <h1>React Performance Demo</h1>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          gap: 12,
          alignItems: "center",
        }}
      >
        <input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
        />
        <label>
          Sort:
          <select
            value={sortBy}
            onChange={(e) => changeSort(e.target.value as "name" | "price")}
            style={{ marginLeft: 8 }}
          >
            <option value="name">Name</option>
            <option value="price">Price</option>
          </select>
        </label>
      </section>
      <details open style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer" }}>
          1) Naïve list (map all items, no guards)
        </summary>
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            marginTop: 8,
            maxHeight: 320,
            overflow: "auto",
          }}
        >
          {naiveList.map((item) => (
            <NaiveRow
              key={item.id}
              item={item}
              isFavorite={favorites.has(item.id)}
              onToggle={naiveToggle}
              onOpen={setShowDetailsFor}
            />
          ))}
        </div>
      </details>

      <div style={{ marginTop: 12, display: "flex", gap: 16 }}>
        <strong>Count: {naiveList.length.toLocaleString()}</strong>
        <strong>Total £: {total.toLocaleString()}</strong>
      </div>

      {showDetailsFor && (
        <ProductDetails
          id={showDetailsFor}
          onClose={() => setShowDetailsFor(null)}
        />
      )}
    </div>
  );
};

export default App;
