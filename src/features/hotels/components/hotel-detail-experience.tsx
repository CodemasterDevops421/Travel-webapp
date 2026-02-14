'use client';

import { useMemo, useState } from 'react';
import type { HotelDetails, HotelRateOption } from '@/server/liteapi';
import { PreferenceLink } from '@/components/navigation/preference-link';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Star, 
  Wifi, 
  Car, 
  Coffee, 
  Dumbbell, 
  Waves, 
  Utensils, 
  Clock, 
  Shield,
  Check,
  Sparkles,
  X,
  Maximize2,
  MessageCircle
} from 'lucide-react';

type HotelDetailExperienceProps = {
  hotelId: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  hotel: HotelDetails | null;
  rates: HotelRateOption[];
};

const SECTION_TABS = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'rooms', label: 'Rooms', icon: Waves },
  { id: 'facilities', label: 'Facilities', icon: Check },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'description', label: 'Description', icon: Clock },
  { id: 'ask-ai', label: 'Ask AI', icon: MessageCircle }
];

function formatMoney(currency: string, amount: number | null, compact = false): string {
  if (amount === null) return 'Unavailable';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: compact ? 0 : 2
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function GalleryLightbox({ 
  photos, 
  hotelName, 
  onClose 
}: { 
  photos: string[]; 
  hotelName?: string; 
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prev = () => setCurrentIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
  const next = () => setCurrentIndex((i) => (i === photos.length - 1 ? 0 : i + 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in">
      <button 
        type="button" 
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-6 w-6" />
      </button>
      
      <button
        type="button"
        onClick={prev}
        className="absolute left-4 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      
      <button
        type="button"
        onClick={next}
        className="absolute right-4 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="max-h-[85vh] max-w-5xl animate-scale-in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={photos[currentIndex]} 
          alt={`${hotelName} - Photo ${currentIndex + 1}`} 
          className="max-h-[80vh] w-full rounded-xl object-contain"
        />
      </div>
      
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
        {photos.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all ${
              idx === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
      
      <div className="absolute bottom-4 right-4 rounded-full bg-black/50 px-4 py-2 text-sm text-white">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
}

function RoomCard({ 
  rate, 
  hotelId, 
  checkin, 
  checkout, 
  adults, 
  rooms 
}: { 
  rate: HotelRateOption; 
  hotelId: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
}) {
  const bookingQuery = new URLSearchParams({
    hotelId,
    roomId: rate.roomId,
    offerId: rate.offerId,
    amount: String(rate.amount),
    currency: rate.currency,
    checkIn: checkin,
    checkOut: checkout,
    adults: String(adults),
    rooms: String(rooms)
  });

  const isRefundable = rate.refundableTag?.toLowerCase().includes('free') || rate.refundableTag?.toLowerCase().includes('refundable');

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 animate-slide-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold transition-colors group-hover:text-primary">{rate.roomName}</h3>
            {isRefundable && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Shield className="h-3 w-3" />
                Free cancellation
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {rate.boardName && (
              <span className="flex items-center gap-1 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium">
                <Utensils className="h-3.5 w-3.5" />
                {rate.boardName}
              </span>
            )}
            {rate.refundableTag && !isRefundable && (
              <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                {rate.refundableTag}
              </span>
            )}
            {rate.cancelTime && (
              <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5" />
                Cancel until {rate.cancelTime}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>✓ Free WiFi</span>
            <span>✓ Smart TV</span>
            <span>✓ Air conditioning</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3 lg:min-w-[180px]">
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">From</p>
            <p className="text-2xl font-bold text-primary">{formatMoney(rate.currency, rate.amount, true)}</p>
            <p className="text-xs text-muted-foreground">+ taxes and fees</p>
          </div>
          <PreferenceLink
            href={`/booking?${bookingQuery.toString()}`}
            className="w-full rounded-full bg-primary px-5 py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-105 lg:w-auto"
          >
            Select room
          </PreferenceLink>
        </div>
      </div>
    </article>
  );
}

function ReviewCard({ review, index }: { review: { author?: string; travelerType?: string; score?: number | null; createdAt?: string; comment?: string }; index: number }) {
  return (
    <article className={`rounded-2xl border border-border/50 bg-card/60 p-4 animate-slide-up stagger-${Math.min(index + 1, 6)}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 font-semibold text-primary">
          {(review.author ?? 'G')[0].toUpperCase()}
        </div>
        <div>
          <p className="font-semibold">{review.author ?? 'Guest'}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {review.travelerType && <span>{review.travelerType}</span>}
            {review.travelerType && review.score && <span>•</span>}
            {review.score && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-500" />
                {review.score.toFixed(1)}
              </span>
            )}
            {review.createdAt && <span>• {review.createdAt}</span>}
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>
    </article>
  );
}

function FacilityBadge({ facility }: { facility: string }) {
  const getIcon = () => {
    const lower = facility.toLowerCase();
    if (lower.includes('wifi')) return <Wifi className="h-4 w-4" />;
    if (lower.includes('parking') || lower.includes('car')) return <Car className="h-4 w-4" />;
    if (lower.includes('breakfast') || lower.includes('food') || lower.includes('restaurant')) return <Coffee className="h-4 w-4" />;
    if (lower.includes('gym') || lower.includes('fitness')) return <Dumbbell className="h-4 w-4" />;
    if (lower.includes('pool') || lower.includes('swim') || lower.includes('water')) return <Waves className="h-4 w-4" />;
    return <Check className="h-4 w-4" />;
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-4 py-2.5 text-sm transition-all hover:bg-background/80 hover:shadow-sm">
      <span className="text-primary">{getIcon()}</span>
      {facility}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 md:py-9">
      <section className="space-y-3 rounded-3xl border border-border/80 bg-card/85 p-5 shadow-sm md:p-6">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </section>
      <section className="grid gap-3 md:grid-cols-[1.2fr,1fr]">
        <div className="h-[360px] animate-pulse rounded-2xl bg-muted md:h-[430px]" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[210px] animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </section>
    </div>
  );
}

export function HotelDetailExperience({ hotelId, checkin, checkout, adults, rooms, hotel, rates }: HotelDetailExperienceProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [askAnswer, setAskAnswer] = useState('');
  const [askLoading, setAskLoading] = useState(false);

  const photos = hotel?.photos?.length ? hotel.photos : hotel?.mainPhoto ? [hotel.mainPhoto] : [];
  const facilities = hotel?.facilities?.length
    ? hotel.facilities
    : ['Free WiFi', '24-hour front desk', 'Luggage storage', 'Elevator', 'Smoke-free property'];
  const lowestRate = rates.reduce<number | null>((min, rate) => (min === null || rate.amount < min ? rate.amount : min), null);
  const currency = rates[0]?.currency ?? 'USD';
  const address = hotel?.address ?? `${hotel?.city ?? 'Unknown city'}${hotel?.countryCode ? `, ${hotel.countryCode}` : ''}`;
  const reviewBreakdown = hotel?.reviewBreakdown ?? [];
  const reviews = hotel?.reviews ?? [];
  const browseHotelsHref = `/hotels?q=${encodeURIComponent(hotel?.city ?? '')}&checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&adults=${adults}&rooms=${rooms}`;

  const mapUrl = useMemo(() => {
    if (hotel?.latitude && hotel?.longitude) {
      return `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${hotel.latitude}%2C${hotel.longitude}`;
    }
    return `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=48.8566%2C2.3522`;
  }, [hotel?.latitude, hotel?.longitude]);

  async function askHotelAI(nextQuestion?: string) {
    const prompt = (nextQuestion ?? question).trim();
    if (!prompt) return;
    setAskLoading(true);
    setAskAnswer('');
    try {
      const response = await fetch('/api/hotel-ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hotelId, question: prompt })
      });
      const json = await response.json();
      if (!response.ok) {
        setAskAnswer(json.error ?? 'Unable to fetch AI answer right now.');
      } else {
        setAskAnswer(json.answer ?? 'No answer available.');
      }
    } catch {
      setAskAnswer('Unable to fetch AI answer right now.');
    } finally {
      setAskLoading(false);
    }
  }

  if (!hotel) {
    return <LoadingSkeleton />;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 md:py-9">
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-lg md:p-6 animate-fade-in">
        <PreferenceLink href={browseHotelsHref} className="group inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          See all properties
        </PreferenceLink>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">{hotel.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {address}
            </p>
            {hotel.reviewScore ? (
              <p className="mt-2 text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                {hotel.reviewScore.toFixed(1)} / 10 guest rating
                {hotel.reviewCount ? ` · Based on ${Math.round(hotel.reviewCount)} reviews` : ''}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Guest reviews are not available for this property yet.</p>
            )}
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3 text-right shadow-lg shadow-primary/10">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">From</p>
            <p className="text-2xl font-bold text-primary">{formatMoney(currency, lowestRate, true)}</p>
            <p className="text-xs text-muted-foreground">/ night</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-[1.2fr,1fr]">
        {photos[0] ? (
          <button 
            type="button" 
            className="group relative overflow-hidden rounded-2xl border border-border bg-card/85 text-left transition-all hover:border-primary/30 hover:shadow-lg"
            onClick={() => setLightboxIndex(0)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={photos[0]} 
              alt={hotel.name} 
              className="h-[360px] w-full object-cover transition-transform duration-500 group-hover:scale-105 md:h-[430px]" 
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
              <Maximize2 className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </button>
        ) : (
          <article className="flex h-[360px] items-center justify-center rounded-2xl border border-border bg-card/70 md:h-[430px]">
            <p className="text-sm text-muted-foreground">Photos unavailable</p>
          </article>
        )}
        <div className="grid grid-cols-2 gap-3">
          {photos.slice(1, 5).map((photo, index) => (
            <button
              key={`${photo}-${index}`}
              type="button"
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/85 transition-all hover:border-primary/30 hover:shadow-lg"
              onClick={() => setLightboxIndex(index + 1)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={photo} 
                alt={`${hotel.name} view ${index + 2}`} 
                className="h-[210px] w-full object-cover transition-transform duration-500 group-hover:scale-105" 
              />
              {index === 3 && photos.length > 5 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 transition-colors group-hover:bg-black/60">
                  <span className="text-lg font-semibold text-white">+{photos.length - 5} more</span>
                </div>
              )}
            </button>
          ))}
          {!photos[1] && (
            <article className="col-span-2 flex h-[210px] items-center justify-center rounded-2xl border border-border bg-card/70">
              <p className="text-sm text-muted-foreground">Show all pictures</p>
            </article>
          )}
        </div>
      </section>

      <nav className="sticky top-2 z-10 flex flex-wrap gap-2 rounded-2xl border border-border/80 glass-card p-2 backdrop-blur-xl">
        {SECTION_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === tab.id 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                  : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </a>
          );
        })}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[1.75fr,0.95fr]">
        <div className="space-y-5">
          <section id="overview" className="rounded-2xl border border-border glass-card p-5 animate-fade-in" onMouseEnter={() => setActiveTab('overview')}>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Smart highlights
            </h2>
            <ul className="mt-4 space-y-3">
              <li className="rounded-xl border border-border/50 bg-gradient-to-r from-primary/5 to-transparent p-4 transition-all hover:shadow-md">
                <p className="font-semibold">Prime location access</p>
                <p className="text-sm text-muted-foreground">Close to major landmarks and city experiences.</p>
              </li>
              <li className="rounded-xl border border-border/50 bg-gradient-to-r from-secondary/5 to-transparent p-4 transition-all hover:shadow-md">
                <p className="font-semibold">Comfort-focused stay</p>
                <p className="text-sm text-muted-foreground">Dependable rooms and practical amenities for short or long stays.</p>
              </li>
              <li className="rounded-xl border border-border/50 bg-gradient-to-r from-accent/5 to-transparent p-4 transition-all hover:shadow-md">
                <p className="font-semibold">Transparent booking flow</p>
                <p className="text-sm text-muted-foreground">Total price and cancellation terms are shown before confirmation.</p>
              </li>
            </ul>
            <div className="mt-5 overflow-hidden rounded-xl border border-border shadow-lg">
              <iframe title="Hotel map" src={mapUrl} className="h-56 w-full" loading="lazy" />
            </div>
          </section>

          <section id="rooms" className="space-y-4 rounded-2xl border border-border glass-card p-5 animate-fade-in" onMouseEnter={() => setActiveTab('rooms')}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Waves className="h-5 w-5 text-primary" />
                Choose your room
              </h2>
              <span className="text-sm text-muted-foreground">
                {checkin} to {checkout} · {adults} adults · {rooms} room{rooms > 1 ? 's' : ''}
              </span>
            </div>
            {rates.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/50 py-12 text-center">
                <p className="text-muted-foreground">No rates found for selected dates.</p>
                <Button className="mt-4" onClick={() => window.history.back()}>
                  Try different dates
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {rates.map((rate, idx) => (
                  <RoomCard 
                    key={`${rate.offerId}-${rate.roomId}`} 
                    rate={rate} 
                    hotelId={hotelId}
                    checkin={checkin}
                    checkout={checkout}
                    adults={adults}
                    rooms={rooms}
                  />
                ))}
              </div>
            )}
          </section>

          <section id="facilities" className="rounded-2xl border border-border glass-card p-5 animate-fade-in" onMouseEnter={() => setActiveTab('facilities')}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                Popular facilities
              </h2>
              <span className="text-xs text-muted-foreground">{facilities.length} amenities</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {facilities.map((facility, idx) => (
                <div key={facility} className={`animate-slide-up stagger-${Math.min(idx + 1, 6)}`}>
                  <FacilityBadge facility={facility} />
                </div>
              ))}
            </div>
          </section>

          <section id="reviews" className="rounded-2xl border border-border glass-card p-5 animate-fade-in" onMouseEnter={() => setActiveTab('reviews')}>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Guest reviews
            </h2>
            {hotel.reviewScore ? (
              <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                {hotel.reviewScore.toFixed(1)} · Based on {hotel.reviewCount ? Math.round(hotel.reviewCount) : 'available'} reviews
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No verified review score available from supplier for this property.</p>
            )}

            {reviewBreakdown.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {reviewBreakdown.map((item, idx) => (
                  <div key={item.label} className={`rounded-xl border border-border/50 bg-background/60 p-3 text-sm animate-slide-up stagger-${Math.min(idx + 1, 6)}`}>
                    <div className="flex items-center justify-between">
                      <p>{item.label}</p>
                      <p className="font-semibold text-primary">{item.score.toFixed(1)}</p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000" 
                        style={{ width: `${Math.max(0, Math.min(100, (item.score / 10) * 100))}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {reviews.length > 0 && (
              <div className="mt-5 space-y-3">
                {reviews.slice(0, 6).map((review, idx) => (
                  <ReviewCard key={`${review.author ?? 'guest'}-${idx}`} review={review} index={idx} />
                ))}
              </div>
            )}
          </section>

          <section id="description" className="rounded-2xl border border-border glass-card p-5 animate-fade-in" onMouseEnter={() => setActiveTab('description')}>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Property description
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {hotel.description ?? 'Property description is currently unavailable.'}
            </p>
          </section>

          <section id="ask-ai" className="rounded-2xl border border-border glass-card p-5 animate-fade-in" onMouseEnter={() => setActiveTab('ask-ai')}>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">AI Assistant</p>
            <h2 className="mt-2 text-xl font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Ask about this hotel
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Get quick answers about facilities, policies, and stay details.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Does this property have parking?', 'Is breakfast included?', 'What are check-in/check-out times?'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="rounded-full border border-border/60 bg-background/60 px-4 py-2 text-xs font-medium transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
                  onClick={() => {
                    setQuestion(preset);
                    void askHotelAI(preset);
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                className="input-glass w-full rounded-xl border border-border bg-white/60 px-4 py-3 text-sm"
                placeholder="Ask anything..."
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void askHotelAI();
                  }
                }}
              />
              <Button
                className="rounded-xl px-5"
                onClick={() => void askHotelAI()}
                disabled={askLoading}
              >
                {askLoading ? 'Asking...' : 'Ask'}
              </Button>
            </div>
            {askAnswer && (
              <div className="mt-4 animate-slide-up rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                <p className="font-semibold text-primary mb-1">AI Answer:</p>
                {askAnswer}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <article className="rounded-2xl border border-border/80 glass-card p-5 shadow-lg animate-slide-up">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Best price</p>
            <p className="mt-1 text-3xl font-bold text-gradient">{formatMoney(currency, lowestRate, true)}</p>
            <p className="text-xs text-muted-foreground">/ night</p>
            <div className="mt-4 space-y-2 rounded-xl border border-border/50 bg-background/60 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Check-in</span>
                <span className="font-medium">{checkin}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Check-out</span>
                <span className="font-medium">{checkout}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Guests</span>
                <span className="font-medium">{adults} adults · {rooms} room{rooms > 1 ? 's' : ''}</span>
              </div>
            </div>
            <a href="#rooms" className="mt-4 inline-flex w-full justify-center rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]">
              Choose your room
            </a>
          </article>

          <article className="rounded-2xl border border-border/60 bg-emerald-50/50 p-4 dark:bg-emerald-900/10 animate-slide-up stagger-2">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">Secure booking</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Your payment is protected by industry-standard encryption.
                </p>
              </div>
            </div>
          </article>
        </aside>
      </div>

      {lightboxIndex !== null && photos[lightboxIndex] && (
        <GalleryLightbox 
          photos={photos} 
          hotelName={hotel.name} 
          onClose={() => setLightboxIndex(null)} 
        />
      )}
    </main>
  );
}
