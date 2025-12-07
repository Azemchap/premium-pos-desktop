import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  brand?: string;
  selling_price: number;
  cost_price: number;
  tax_rate: number;
  is_taxable: boolean;
  current_stock: number;
  minimum_stock: number;
  available_stock: number;
  is_active: boolean;
  unit_of_measure: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  tax_amount: number;
  total: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product) => boolean;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => boolean;
  updatePrice: (productId: number, price: number) => boolean;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getTaxAmount: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product) => {
        const state = get();
        const existingItem = state.items.find((item) => item.product.id === product.id);
        
        // Check available stock
        if (product.available_stock <= 0) {
          return false;
        }

        const currentCartQuantity = existingItem ? existingItem.quantity : 0;
        const newTotalQuantity = currentCartQuantity + 1;

        // Validate against available_stock
        if (newTotalQuantity > product.available_stock) {
          return false;
        }

        if (existingItem) {
          // Update existing item
          set({
            items: state.items.map((item) =>
              item.product.id === product.id
                ? {
                    ...item,
                    quantity: item.quantity + 1,
                    total: (item.quantity + 1) * (item.price + item.tax_amount),
                  }
                : item
            ),
          });
        } else {
          // Add new item
          const taxAmount = product.is_taxable
            ? product.selling_price * (product.tax_rate / 100)
            : 0;
          const total = product.selling_price + taxAmount;

          set({
            items: [
              ...state.items,
              {
                product,
                quantity: 1,
                price: product.selling_price,
                tax_amount: taxAmount,
                total,
              },
            ],
          });
        }

        return true;
      },

      updatePrice: (productId: number, newPrice: number) => {
        if (newPrice < 0) return false;

        const state = get();
        const item = state.items.find((ci) => ci.product.id === productId);
        if (!item) return false;

        const taxAmount = item.product.is_taxable
          ? newPrice * (item.product.tax_rate / 100)
          : 0;

        set({
          items: state.items.map((ci) =>
            ci.product.id === productId
              ? {
                  ...ci,
                  price: newPrice,
                  tax_amount: taxAmount,
                  total: ci.quantity * (newPrice + taxAmount),
                }
              : ci
          ),
        });

        return true;
      },

      removeItem: (productId: number) => {
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        }));
      },

      updateQuantity: (productId: number, newQuantity: number) => {
        if (newQuantity <= 0) {
          get().removeItem(productId);
          return true;
        }

        const state = get();
        const item = state.items.find((item) => item.product.id === productId);
        if (!item) return false;

        // Validate against available_stock
        if (newQuantity > item.product.available_stock) {
          return false;
        }

        set({
          items: state.items.map((item) =>
            item.product.id === productId
              ? {
                  ...item,
                  quantity: newQuantity,
                  total: newQuantity * (item.price + item.tax_amount),
                }
              : item
          ),
        });

        return true;
      },

      clearCart: () => {
        set({ items: [] });
      },

      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getTaxAmount: () => {
        return get().items.reduce((total, item) => total + item.tax_amount * item.quantity, 0);
      },

      getTotal: () => {
        return get().items.reduce((total, item) => total + item.total, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
