'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Images } from 'lucide-react';
import Image from 'next/image';

type HotelPhotoGalleryProps = {
  photos: string[];
  hotelName: string;
  lightboxIndex: number | null;
  onOpen: (index: number) => void;
  onClose: () => void;
};

export function HotelPhotoGallery({ photos, hotelName, lightboxIndex, onOpen, onClose }: HotelPhotoGalleryProps) {
  const [mobileIndex, setMobileIndex] = useState(0);
  const remainingCount = Math.max(0, photos.length - 5);
  const displayPhotos = useMemo(() => photos.slice(0, 5), [photos]);

  useEffect(() => {
    if (mobileIndex >= photos.length) {
      setMobileIndex(0);
    }
  }, [mobileIndex, photos.length]);

  function stepMobileGallery(direction: -1 | 1) {
    if (photos.length <= 1) return;
    setMobileIndex((current) => {
      const next = current + direction;
      if (next < 0) return photos.length - 1;
      if (next >= photos.length) return 0;
      return next;
    });
  }

  return (
    <>
      <section className="space-y-3">
        {photos[0] ? (
          <>
            <div className="overflow-hidden rounded-[22px] border border-border/60 bg-card shadow-[0_20px_54px_-42px_rgba(15,23,42,0.42)]">
              <div className="relative md:hidden">
                <button type="button" className="group relative block h-[320px] w-full overflow-hidden bg-muted sm:h-[360px]" onClick={() => onOpen(mobileIndex)}>
                  <Image
                    src={photos[mobileIndex]}
                    alt={`${hotelName} view ${mobileIndex + 1}`}
                    fill
                    sizes="100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
                    <Images className="h-3.5 w-3.5" />
                    Main view
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 text-white">
                    <div className="min-w-0 rounded-2xl border border-white/15 bg-black/35 px-4 py-3 backdrop-blur">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/75">Property gallery</p>
                      <p className="mt-1 text-sm font-semibold">See the stay before you book</p>
                    </div>
                    <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold">
                      {mobileIndex + 1} / {photos.length}
                    </span>
                  </div>
                </button>
                {photos.length > 1 ? (
                  <>
                    <button
                      type="button"
                      aria-label="Previous photo"
                      className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/60"
                      onClick={() => stepMobileGallery(-1)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next photo"
                      className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/60"
                      onClick={() => stepMobileGallery(1)}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                ) : null}
              </div>

              {photos.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto px-3 py-3 scrollbar-none md:hidden">
                  {photos.map((photo, index) => (
                    <button
                      key={`${photo}-${index}-thumb`}
                      type="button"
                      onClick={() => setMobileIndex(index)}
                      className={`relative h-20 w-24 flex-none overflow-hidden rounded-2xl border transition-all ${mobileIndex === index ? 'border-primary shadow-[0_10px_24px_-18px_rgba(37,99,235,0.95)]' : 'border-border/70 opacity-80'}`}
                    >
                      <Image src={photo} alt={`${hotelName} thumbnail ${index + 1}`} fill sizes="96px" className="object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="hidden h-[430px] grid-cols-[minmax(0,1.75fr),minmax(260px,0.95fr)] gap-1.5 p-1.5 md:grid lg:h-[460px]">
                <button type="button" className="group relative h-full overflow-hidden rounded-[18px] bg-muted" onClick={() => onOpen(0)}>
                  <Image src={photos[0]} alt={hotelName} fill sizes="(max-width: 1024px) 65vw, 720px" className="object-cover transition-transform duration-700 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none" />
                  <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-95 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute left-4 top-4 rounded-full border border-white/25 bg-black/35 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                    Main view
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <div className="rounded-2xl border border-white/20 bg-black/35 px-4 py-3 text-left text-white backdrop-blur">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/75">Property gallery</p>
                      <p className="mt-1 text-sm font-semibold">See the stay before you book</p>
                    </div>
                  </div>
                </button>

                <div className="grid h-full grid-cols-2 grid-rows-6 gap-1.5">
                  {displayPhotos.slice(1, 5).map((photo, index) => {
                    const isLastTile = index === 3;
                    const tileClasses = index < 2 ? 'row-span-3' : 'row-span-3';
                    return (
                      <button
                        key={`${photo}-${index}`}
                        type="button"
                        className={`group relative h-full w-full overflow-hidden rounded-[16px] bg-muted ${tileClasses}`}
                        onClick={() => onOpen(index + 1)}
                      >
                        <Image
                          src={photo}
                          alt={`${hotelName} view ${index + 2}`}
                          fill
                          sizes="(max-width: 1024px) 24vw, 220px"
                          className="object-cover transition-transform duration-700 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
                        {isLastTile && remainingCount > 0 ? (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white">
                            +{remainingCount} more photos
                          </span>
                        ) : (
                          <span className="absolute bottom-3 left-3 rounded-full border border-white/30 bg-black/35 px-3 py-1 text-[11px] font-semibold text-white opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
                            View photo
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {!photos[1] ? (
                    <article className="col-span-2 row-span-6 flex h-full items-center justify-center rounded-[18px] border border-border bg-card/70">
                      <p className="text-sm text-muted-foreground">Show all pictures</p>
                    </article>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : (
          <article className="flex h-[280px] items-center justify-center rounded-[22px] border border-border/60 bg-muted">
            <p className="text-sm text-muted-foreground">Photos unavailable</p>
          </article>
        )}
      </section>

      {photos.length > 0 ? (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
            onClick={() => onOpen(0)}
          >
            Show all {photos.length} photos
          </button>
        </div>
      ) : null}

      {lightboxIndex !== null && photos[lightboxIndex] ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <button type="button" className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-sm font-semibold" onClick={onClose}>
            Close
          </button>
          <div className="relative h-[85vh] w-[85vw] max-w-5xl overflow-hidden rounded-xl">
            <Image src={photos[lightboxIndex]} alt={`${hotelName} enlarged`} fill className="object-contain" />
          </div>
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-2 text-sm font-semibold"
                onClick={() => onOpen((lightboxIndex - 1 + photos.length) % photos.length)}
              >
                Prev
              </button>
              <button
                type="button"
                className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-2 text-sm font-semibold"
                onClick={() => onOpen((lightboxIndex + 1) % photos.length)}
              >
                Next
              </button>
              <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                {lightboxIndex + 1} / {photos.length}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
