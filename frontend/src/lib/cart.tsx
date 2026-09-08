import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export interface CartLine {
  productId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}

interface CartContextValue {
  lines: CartLine[];
  addItem: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "ksmilk_cart";

function readInitial(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readInitial);

  function persist(next: CartLine[]) {
    setLines(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function addItem(line: Omit<CartLine, "quantity">, quantity = 1) {
    const existing = lines.find((l) => l.productId === line.productId);
    if (existing) {
      persist(lines.map((l) => (l.productId === line.productId ? { ...l, quantity: l.quantity + quantity } : l)));
    } else {
      persist([...lines, { ...line, quantity }]);
    }
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    persist(lines.map((l) => (l.productId === productId ? { ...l, quantity } : l)));
  }

  function removeItem(productId: string) {
    persist(lines.filter((l) => l.productId !== productId));
  }

  function clear() {
    persist([]);
  }

  const subtotal = useMemo(() => lines.reduce((sum, l) => sum + l.price * l.quantity, 0), [lines]);
  const itemCount = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);

  return (
    <CartContext.Provider value={{ lines, addItem, updateQuantity, removeItem, clear, subtotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
