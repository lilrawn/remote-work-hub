import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Category, JobAccount } from '@/types';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('min_price', { ascending: true });
      
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useJobAccounts(categoryId?: string) {
  return useQuery({
    queryKey: ['job_accounts', categoryId],
    queryFn: async (): Promise<JobAccount[]> => {
      let query = supabase
        .from('job_accounts')
        .select('*, category:categories(*)')
        .eq('is_available', true)
        .order('price', { ascending: true });
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as JobAccount[];
    },
  });
}

export function useJobAccount(id: string) {
  return useQuery({
    queryKey: ['job_account', id],
    queryFn: async (): Promise<JobAccount | null> => {
      const { data, error } = await supabase
        .from('job_accounts')
        .select('*, category:categories(*)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as JobAccount;
    },
    enabled: !!id,
  });
}
