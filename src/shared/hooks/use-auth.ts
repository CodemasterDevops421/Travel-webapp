'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/server/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const refreshAuthState = useCallback(async () => {
        try {
            const {
                data: { user }
            } = await supabase.auth.getUser();
            setUser(user);
            setError(null);
        } catch {
            setUser(null);
            setError('Unable to verify your session right now.');
        } finally {
            setIsLoading(false);
        }
    }, [supabase.auth]);

    useEffect(() => {
        refreshAuthState();

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            if (event === 'SIGNED_OUT') {
                setError(null);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [refreshAuthState, supabase.auth]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        window.location.href = '/';
    }, [supabase.auth]);

    return { user, isLoading, error, signOut, refreshAuthState };
}
