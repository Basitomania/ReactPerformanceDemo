import React, {
  useMemo,
  useState,
  useDeferredValue,
  useTransition,
  useCallback,
  Suspense,
  lazy,
} from "react";
import {
  FixedSizeList as VirtualList,
  ListChildComponentProps,
} from "react-window";

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
}

// Heavy details panel (code-split demo)
const ProductDetails = lazy(() => import("./ProductDetails"));

// --- Optimized row: memoized + cheap props ---
const OptimizedRow = React.memo(function OptimizedRow({
  item,
  isFavorite,
  onToggle,
  style,
}: {
  item: Item;
  isFavorite: boolean;
  onToggle: (id: number) => void;
  style?: React.CSSProperties;
}) {
  // move the “expensive” derived calc behind a memo tied to stable input
  const fakeCalc = useMemo(() => {
    let acc = 0;
    for (let i = 0; i < 500; i++) acc += item.price;
    return acc % 7;
  }, [item.price]);

  return (
    <div
      style={{
        ...style,
        display: "flex",
        gap: 12,
        padding: 6,
        borderBottom: "1px solid #eee",
        alignItems: "center",
      }}
    >
      <strong
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {item.name}
      </strong>
      <span style={{ width: 70, textAlign: "right" }}>£{item.price}</span>
      <span style={{ width: 110 }}>{item.category}</span>
      <button onClick={() => onToggle(item.id)}>
        {isFavorite ? "★" : "☆"}
      </button>
      <span style={{ opacity: 0.3, fontSize: 12 }}>calc:{fakeCalc}</span>
    </div>
  );
});

const App = () => {
  // shared dataset
  const [items] = useState(() => createItems());
  const [favorites, setFavorites] = useState<Set<number>>(() => new Set());
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price">("name");
  const [showDetailsFor, setShowDetailsFor] = useState<number | null>(null);

  // OPTIMIZED: stable handler + immutable Set updates
  const optToggle = useCallback((id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // make typing feel snappy for filtering
  const deferredSearch = useDeferredValue(search);

  // prefer transitions for expensive sorts (keeps input responsive)
  const [isPending, startTransition] = useTransition();
  const changeSort = (key: "name" | "price") => {
    startTransition(() => setSortBy(key));
  };

  // OPTIMIZED: derived data memoized + based on deferred input
  const optimizedList = useMemo(() => {
    const q = deferredSearch.toLowerCase();
    const base = q
      ? items.filter((it) => it.name.toLowerCase().includes(q))
      : items;
    const sorted = [...base].sort((a, b) =>
      sortBy === "name" ? a.name.localeCompare(b.name) : a.price - b.price
    );
    return sorted;
  }, [items, deferredSearch, sortBy]);

  // cheap aggregate: memoize too
  const total = useMemo(
    () => optimizedList.reduce((sum, i) => sum + i.price, 0),
    [optimizedList]
  );

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
        {isPending && <span style={{ opacity: 0.7 }}>sorting…</span>}
      </section>

      <details open style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer" }}>
          2) Optimized list (memoized, virtualized, stable handlers, deferred
          input)
        </summary>
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            marginTop: 8,
            height: 320,
          }}
        >
          {/* Virtualization: only ~10-12 rows render at a time */}
          <VirtualList
            height={320}
            itemCount={optimizedList.length}
            itemSize={44}
            width={"100%"}
            itemData={{
              list: optimizedList,
              favorites,
              toggle: optToggle,
              open: setShowDetailsFor,
            }}
          >
            {RowRenderer}
          </VirtualList>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 16 }}>
          <strong>Count: {optimizedList.length.toLocaleString()}</strong>
          <strong>Total £: {total.toLocaleString()}</strong>
        </div>
      </details>

      <Suspense
        fallback={<div style={{ marginTop: 12 }}>Loading details…</div>}
      >
        {showDetailsFor && (
          <ProductDetails
            id={showDetailsFor}
            onClose={() => setShowDetailsFor(null)}
          />
        )}
      </Suspense>
    </div>
  );
};

export default App;

// react-window row renderer (memo by default via child function + stable itemData usage)
const RowRenderer = React.memo(function RowRenderer({
  index,
  style,
  data,
}: ListChildComponentProps) {
  const item: Item = data.list[index];
  const isFavorite = (data.favorites as Set<number>).has(item.id);
  const onToggle = data.toggle as (id: number) => void;
  const open = data.open as (id: number) => void;

  return (
    <div style={style} onDoubleClick={() => open(item.id)}>
      <OptimizedRow item={item} isFavorite={isFavorite} onToggle={onToggle} />
    </div>
  );
});
