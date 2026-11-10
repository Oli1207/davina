import { create } from 'zustand';
import { supabase, supabaseReady } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';

export const useAuth = create((set) => ({
  session: null,
  ready: !supabaseReady,
  async init() {
    if (!supabaseReady) return;
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, ready: true });
    supabase.auth.onAuthStateChange((_event, session) => set({ session }));
  },
  async signOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    localStorage.removeItem('davina-cache');
  },
}));
