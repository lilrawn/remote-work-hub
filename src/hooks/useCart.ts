import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, JobAccount } from '@/types';

interface CartStore {
  items: CartItem[];
  addItem: (job: JobAccount) => void;
  removeItem: (jobId: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getItemCount: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (job: JobAccount) => {
        const items = get().items;
        const existingItem = items.find(item => item.job.id === job.id);
        
        if (existingItem) {
          // Job accounts are unique, don't add duplicates
          return;
        }
        
        set({ items: [...items, { job, quantity: 1 }] });
      },
      
      removeItem: (jobId: string) => {
        set({ items: get().items.filter(item => item.job.id !== jobId) });
      },
      
      clearCart: () => {
        set({ items: [] });
      },
      
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.job.price, 0);
      },
      
      getItemCount: () => {
        return get().items.length;
      },
    }),
    {
      name: 'remote-work-cart',
    }
  )
);
