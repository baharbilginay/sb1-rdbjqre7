import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { usePortfolio } from './usePortfolio';

interface Profile {
  id: string;
  full_name: string | null;
  balance: number;
}

interface PortfolioSummary {
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { portfolio } = usePortfolio();

  const portfolioSummary: PortfolioSummary = {
    totalValue: portfolio.reduce((sum, item) => sum + item.current_value, 0),
    totalProfitLoss: portfolio.reduce((sum, item) => sum + item.profit_loss, 0),
    totalProfitLossPercentage: portfolio.reduce((sum, item) => sum + item.profit_loss_percentage, 0) / (portfolio.length || 1),
  };

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();

    // Auth state değişikliklerini dinle
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    // Profil değişikliklerini dinle
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          // Sadece kendi profilimiz değiştiğinde güncelle
          const { data: { user } } = supabase.auth.getUser();
          if (user && payload.new && payload.new.id === user.id) {
            setProfile(payload.new as Profile);
          }
        }
      )
      .subscribe();

    return () => {
      authSubscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [loadProfile]);

  return { 
    profile, 
    portfolioSummary, 
    isLoading,
    refresh: loadProfile 
  };
}