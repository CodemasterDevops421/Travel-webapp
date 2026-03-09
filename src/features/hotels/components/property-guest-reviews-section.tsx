'use client';

import { Heart, Users, UserRound, UserRoundPlus } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { HotelDetails } from '@/server/liteapi';

type PropertyGuestReviewsSectionProps = {
  hotel: HotelDetails | null;
  reviews: NonNullable<HotelDetails['reviews']>;
  reviewBreakdown: NonNullable<HotelDetails['reviewBreakdown']>;
  reviewHighlights: HotelDetails['reviewHighlights'] | undefined;
  reviewSort: 'top' | 'newest' | 'oldest';
  setReviewSort: (value: 'top' | 'newest' | 'oldest') => void;
  visibleReviews: NonNullable<HotelDetails['reviews']>;
  sortedReviewsCount: number;
  showAllReviews: boolean;
  setShowAllReviews: (value: boolean | ((current: boolean) => boolean)) => void;
  formatReviewDate: (value: string | null) => string | null;
  onActivate: () => void;
};

const travelerMix = [
  { label: 'Family', value: '53%', icon: Users },
  { label: 'Couple', value: '30%', icon: Heart },
  { label: 'Friends/Group', value: '11%', icon: UserRoundPlus },
  { label: 'Solo', value: '4%', icon: UserRound }
];

function reviewTone(score: number | null | undefined) {
  if (typeof score !== 'number') {
    return 'bg-muted text-foreground';
  }
  if (score >= 8) {
    return 'bg-emerald-500 text-white';
  }
  if (score >= 5) {
    return 'bg-amber-400 text-amber-950';
  }
  return 'bg-rose-500 text-white';
}

export function PropertyGuestReviewsSection({
  hotel,
  reviews,
  reviewBreakdown,
  reviewHighlights,
  reviewSort,
  setReviewSort,
  visibleReviews,
  sortedReviewsCount,
  showAllReviews,
  setShowAllReviews,
  formatReviewDate,
  onActivate
}: PropertyGuestReviewsSectionProps) {
  const topicChips = reviewHighlights && !reviewHighlights.lowSignal
    ? [...reviewHighlights.positiveTopics, ...reviewHighlights.tradeoffTopics].slice(0, 6)
    : reviewBreakdown.slice(0, 6).map((item) => ({ label: item.label, mentions: item.score }));

  return (
    <section id="reviews" className="surface-shell scroll-mt-24 p-3.5 md:p-4" onMouseEnter={onActivate}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Guest reviews</h2>
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-base font-bold text-white">
              {(hotel?.reviewScore ?? 0).toFixed(1).replace('.0', '')}
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">
                {hotel?.reviewScore ? (hotel.reviewScore >= 9 ? 'Wonderful' : hotel.reviewScore >= 8 ? 'Very good' : 'Good') : 'Verified'}
              </p>
              <p className="text-sm text-muted-foreground">
                Based on {(hotel?.reviewCount ? Math.round(hotel.reviewCount) : reviews.length).toLocaleString()} reviews
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start rounded-full border border-border bg-background px-3 py-1.5">
          <label htmlFor="review-sort" className="sr-only">Sort reviews</label>
          <select
            id="review-sort"
            className="bg-transparent text-sm text-foreground outline-none"
            value={reviewSort}
            onChange={(event) => setReviewSort(event.target.value as 'top' | 'newest' | 'oldest')}
          >
            <option value="top">Top rated</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {visibleReviews.length > 0 ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[280px,minmax(0,1fr)]">
          <aside className="space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Top comments from travelers</p>
              {topicChips.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {topicChips.map((topic) => (
                    <span
                      key={topic.label}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900"
                    >
                      {typeof topic.mentions === 'number' ? `${topic.label} (${topic.mentions.toFixed(1).replace('.0', '')})` : topic.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-border bg-background/70 p-3 text-sm text-muted-foreground">
                  {reviewHighlights?.message ?? 'Not enough verified review volume to generate stable topic highlights yet.'}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Who stays here</p>
              <div className="grid grid-cols-2 gap-3">
                {travelerMix.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex flex-col items-center rounded-xl bg-background px-3 py-3 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="mt-2 text-sm text-foreground">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="overflow-hidden rounded-[22px] border border-border bg-background">
            <div className="divide-y divide-border/70">
              {visibleReviews.map((review, index) => (
                <article key={`${review.author}-${review.createdAt ?? index}`} className="flex items-start gap-4 px-5 py-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-foreground">{review.author ?? 'Guest'}</p>
                      {review.travelerType ? <p className="text-sm text-muted-foreground">• {review.travelerType}</p> : null}
                    </div>
                    {formatReviewDate(review.createdAt) ? (
                      <p className="mt-1 text-sm text-muted-foreground">{formatReviewDate(review.createdAt)}</p>
                    ) : null}
                    {review.comment ? (
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{review.comment}</p>
                    ) : null}
                  </div>

                  {review.score ? (
                    <span
                      className={cn(
                        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold',
                        reviewTone(review.score)
                      )}
                    >
                      {review.score.toFixed(0)}
                    </span>
                  ) : null}
                </article>
              ))}
            </div>

            {sortedReviewsCount > 6 ? (
              <div className="flex flex-col gap-3 border-t border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold transition-colors hover:bg-muted"
                  onClick={() => setShowAllReviews((current) => !current)}
                >
                  {showAllReviews ? 'Collapse reviews' : 'Load more reviews'}
                </button>
                <p className="text-sm text-muted-foreground">
                  Showing {visibleReviews.length} of {sortedReviewsCount} reviews
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
          Detailed guest comments are currently unavailable from the supplier.
        </p>
      )}
    </section>
  );
}
