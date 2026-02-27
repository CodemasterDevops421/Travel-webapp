'use client';

import Image from 'next/image';

type HotelPhotoGalleryProps = {
  photos: string[];
  hotelName: string;
  lightboxIndex: number | null;
  onOpen: (index: number) => void;
  onClose: () => void;
};

export function HotelPhotoGallery({ photos, hotelName, lightboxIndex, onOpen, onClose }: HotelPhotoGalleryProps) {
  return (
    <>
      <section className="grid h-[400px] gap-1 overflow-hidden md:h-[500px] md:grid-cols-[2fr,1fr]">
        {photos[0] ? (
          <button type="button" className="group relative h-full w-full overflow-hidden bg-muted" onClick={() => onOpen(0)}>
            <Image src={photos[0]} alt={hotelName} fill sizes="(max-width: 768px) 100vw, 66vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
          </button>
        ) : (
          <article className="flex h-full w-full items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground">Photos unavailable</p>
          </article>
        )}
        <div className="grid h-full grid-cols-2 grid-rows-2 gap-1">
          {photos.slice(1, 5).map((photo, index) => (
            <button
              key={`${photo}-${index}`}
              type="button"
              className="group relative h-full w-full overflow-hidden bg-muted"
              onClick={() => onOpen(index + 1)}
            >
              <Image src={photo} alt={`${hotelName} view ${index + 2}`} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            </button>
          ))}
          {!photos[1] && (
            <article className="col-span-2 flex h-[210px] items-center justify-center rounded-2xl border border-border bg-card/70">
              <p className="text-sm text-muted-foreground">Show all pictures</p>
            </article>
          )}
        </div>
      </section>

      {lightboxIndex !== null && photos[lightboxIndex] ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <button type="button" className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-sm font-semibold" onClick={onClose}>
            Close
          </button>
          <div className="relative h-[85vh] w-[85vw] max-w-5xl overflow-hidden rounded-xl">
            <Image src={photos[lightboxIndex]} alt={`${hotelName} enlarged`} fill className="object-contain" />
          </div>
        </div>
      ) : null}
    </>
  );
}
