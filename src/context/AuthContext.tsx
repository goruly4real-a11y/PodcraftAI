import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  plan: 'free' | 'pro';
  clones_used: number;
  generations_used_this_month: number;
  daily_generation_count: number;
  last_generation_date: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isPro: boolean;
  canClone: boolean;
  canGenerate: boolean;
  dailyLimit: number;
  incrementClones: () => Promise<void>;
  incrementGenerations: () => Promise<void>;
  upgradeToPro: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // Fallback
        setProfile({
          id: userId,
          email: user?.email || '',
          plan: 'free',
          clones_used: 0,
          generations_used_this_month: 0,
          daily_generation_count: 0,
          last_generation_date: new Date().toISOString().split('T')[0]
        });
      } else {
        // Check if day has changed
        const today = new Date().toISOString().split('T')[0];
        if (data.last_generation_date !== today) {
          // Reset daily count if it's a new day
          await supabase
            .from('profiles')
            .update({ daily_generation_count: 0, last_generation_date: today })
            .eq('id', userId);
          setProfile({ ...data, daily_generation_count: 0, last_generation_date: today });
        } else {
          setProfile(data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isPro = profile?.plan === 'pro';
  
  // Allow cloning if Pro OR if Free and hasn't used their 1 free clone
  const canClone = isPro || (profile ? profile.clones_used < 1 : false);

  // Daily limit: 1 for free, Unlimited for Pro
  const dailyLimit = isPro ? Infinity : 1;
  const canGenerate = isPro || (profile ? (profile.daily_generation_count || 0) < dailyLimit : false);

  const incrementClones = async () => {
    if (!user || !profile) return;
    
    // Optimistic update
    setProfile(prev => prev ? ({ ...prev, clones_used: prev.clones_used + 1 }) : null);

    const { error } = await supabase
      .from('profiles')
      .update({ clones_used: profile.clones_used + 1 })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating clone count:', error);
      // Revert on error
      fetchProfile(user.id);
    }
  };

  const incrementGenerations = async () => {
    if (!user || !profile) return;
    
    const today = new Date().toISOString().split('T')[0];
    const newCount = (profile.daily_generation_count || 0) + 1;

    // Optimistic update
    setProfile(prev => prev ? ({ ...prev, daily_generation_count: newCount, last_generation_date: today }) : null);

    const { error } = await supabase
      .from('profiles')
      .update({ daily_generation_count: newCount, last_generation_date: today })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating generation count:', error);
      fetchProfile(user.id);
    }
  };

  const upgradeToPro = async () => {
    if (!user) return;
    
    // In a real app, this would redirect to Stripe
    // For now, we just update the database
    const { error } = await supabase
      .from('profiles')
      .update({ plan: 'pro' })
      .eq('id', user.id);

    if (error) {
      alert('Failed to upgrade. Please try again.');
      console.error(error);
    } else {
      setProfile(prev => prev ? ({ ...prev, plan: 'pro' }) : null);
      alert('Welcome to Pro! You now have unlimited access.');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      isPro, 
      canClone,
      canGenerate,
      dailyLimit,
      incrementClones,
      incrementGenerations,
      upgradeToPro, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
