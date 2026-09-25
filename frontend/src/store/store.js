import { configureStore, createSlice } from '@reduxjs/toolkit';

const readStorage = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
};

const cartSlice = createSlice({ name: 'cart', initialState: readStorage('store-cart', []), reducers: {
  addItem: (state, action) => [action.payload, ...state.filter((item) => item.product.id !== action.payload.product.id)],
  removeItems: (state, action) => state.filter((item) => !action.payload.includes(item.product.id)),
  clearCart: () => [],
} });
const purchasesSlice = createSlice({ name: 'purchases', initialState: readStorage('store-purchases', []), reducers: {
  addPurchase: (state, action) => [action.payload, ...state],
} });

export const { addItem, removeItems, clearCart } = cartSlice.actions;
export const { addPurchase } = purchasesSlice.actions;
export const store = configureStore({ reducer: { cart: cartSlice.reducer, purchases: purchasesSlice.reducer } });
store.subscribe(() => {
  const state = store.getState();
  localStorage.setItem('store-cart', JSON.stringify(state.cart));
  localStorage.setItem('store-purchases', JSON.stringify(state.purchases));
});
