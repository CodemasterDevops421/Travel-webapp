'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/shared/hooks/use-auth';

interface SavedHotel {
    id: string;
    hotel_id: string;
    hotel_name: string | null;
    hotel_image: string | null;
    star_rating: number | null;
    city: string | null;
    created_at: string;
}

type WishlistApiResponse = {
  data?: SavedHotel[];
  error?: string;
  code?: string;
};

type TogglePayload = {
  hotelId: string;
  hotelName?: string;
  hotelImage?: string;
  starRating?: number;
  city?: string;
};

export function useWishlist() {
  const { user } = useAuth();
  const [savedHotels, setSavedHotels] = useState<SavedHotel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setSavedHotels([]);
      setSavedIds(new Set());
      setError(null);
      setAuthRequired(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/wishlist', { method: 'GET' });
      const payload = (await res.json().catch(() => ({}))) as WishlistApiResponse;

      if (!res.ok) {
        if (res.status === 401 || payload.code === 'AUTH_REQUIRED') {
          setAuthRequired(true);
          setSavedHotels([]);
          setSavedIds(new Set());
          setError('Sign in to view and manage saved stays.');
          return;
        }
        setError(payload.error ?? 'Unable to refresh wishlist right now.');
        return;
      }

      const data = payload.data ?? [];
      setSavedHotels(data);
      setSavedIds(new Set(data.map((hotel) => hotel.hotel_id)));
      setError(null);
      setAuthRequired(false);
    } catch {
      setError('Unable to refresh wishlist right now.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchWishlist();
  }, [fetchWishlist]);

  const isSaved = useCallback((hotelId: string) => savedIds.has(hotelId), [savedIds]);

  const toggleSave = useCallback(
    async (hotel: TogglePayload) => {
      if (!user) {
        setAuthRequired(true);
        setError('Sign in to save hotels to your wishlist.');
        return false;
      }

      setError(null);
      setAuthRequired(false);
      const alreadySaved = savedIds.has(hotel.hotelId);
      const previousHotels = savedHotels;
      const previousIds = new Set(savedIds);

      if (alreadySaved) {
        setSavedIds((previous) => {
          const next = new Set(previous);
          next.delete(hotel.hotelId);
          return next;
        });
        setSavedHotels((previous) => previous.filter((saved) => saved.hotel_id !== hotel.hotelId));
      } else {
        setSavedIds((previous) => new Set(previous).add(hotel.hotelId));
      }

      try {
        const response = alreadySaved
          ? await fetch(`/api/wishlist?hotelId=${encodeURIComponent(hotel.hotelId)}`, {
              method: 'DELETE'
            })
          : await fetch('/api/wishlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(hotel)
            });

        const payload = (await response.json().catch(() => ({}))) as WishlistApiResponse;
        if (!response.ok) {
          if (response.status === 401 || payload.code === 'AUTH_REQUIRED') {
            setAuthRequired(true);
            setError('Sign in to save hotels to your wishlist.');
          } else {
            setError(payload.error ?? 'Unable to update wishlist right now.');
          }
          setSavedHotels(previousHotels);
          setSavedIds(previousIds);
          return false;
        }

        await fetchWishlist();
        return true;
      } catch {
        setSavedHotels(previousHotels);
        setSavedIds(previousIds);
        setError('Unable to update wishlist right now.');
        return false;
      }
    },
    [fetchWishlist, savedHotels, savedIds, user]
  );

  const clearAuthRequired = useCallback(() => {
    setAuthRequired(false);
  }, []);

  return {
    savedHotels,
    isLoading,
    isSaved,
    toggleSave,
    refreshWishlist: fetchWishlist,
    error,
    authRequired,
    clearAuthRequired
  };
}
