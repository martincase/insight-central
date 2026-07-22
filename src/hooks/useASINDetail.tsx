import { create } from 'zustand';
import type { ASINDetailState, ASINDetailData } from '@/types/asinDetail';
import { ASINDetailService } from '@/services/asinDetailService';

interface ASINDetailStore extends ASINDetailState {
  openASINDetail: (asin: string, merchantToken: string) => Promise<void>;
  closeASINDetail: () => void;
  setError: (error: string | null) => void;
}

export const useASINDetail = create<ASINDetailStore>((set, get) => ({
  isOpen: false,
  asin: null,
  data: null,
  loading: false,
  error: null,

  openASINDetail: async (asin: string, merchantToken: string) => {
    console.log(`🔍 Opening ASIN detail for: ${asin}`);
    
    set({ 
      isOpen: true, 
      asin, 
      loading: true, 
      error: null, 
      data: null 
    });

    try {
      const data = await ASINDetailService.fetchASINDetails(asin, merchantToken);
      set({ data, loading: false });
    } catch (error) {
      console.error('Error fetching ASIN details:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch ASIN details',
        loading: false 
      });
    }
  },

  closeASINDetail: () => {
    set({ 
      isOpen: false, 
      asin: null, 
      data: null, 
      loading: false, 
      error: null 
    });
  },

  setError: (error: string | null) => {
    set({ error });
  }
}));