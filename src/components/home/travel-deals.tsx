'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Star, MapPin, Clock } from 'lucide-react';

const deals = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1544144433-d50aff500b91?w=600&h=400&fit=crop',
    title: '6-Nt Repositioning Cruise on Celebrity Summit',
    price: '$319+',
    originalPrice: '$499',
    type: 'Cruise',
    location: 'Caribbean',
    rating: 4.8,
    reviews: 234,
    discount: 36
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1580541631950-7282082b1536?w=600&h=400&fit=crop',
    title: '7-Day Caribbean Cruise on Celebrity Edge',
    price: '$1,199+',
    originalPrice: '$1,599',
    type: 'Cruise',
    location: 'Caribbean',
    rating: 4.9,
    reviews: 567,
    discount: 25
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1599640845513-534431ba0f76?w=600&h=400&fit=crop',
    title: '7-Day Caribbean Cruise on Carnival Magic',
    price: '$569+',
    originalPrice: '$799',
    type: 'Cruise',
    location: 'Bahamas',
    rating: 4.7,
    reviews: 412,
    discount: 29
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop',
    title: '5-Star Resort in Maui, Hawaii',
    price: '$899+',
    originalPrice: '$1,299',
    type: 'Hotel',
    location: 'Maui, Hawaii',
    rating: 4.9,
    reviews: 892,
    discount: 31
  },
  {
    id: 5,
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=400&fit=crop',
    title: 'All-Inclusive Mexico Resort',
    price: '$649+',
    originalPrice: '$899',
    type: 'Resort',
    location: 'Cancun, Mexico',
    rating: 4.6,
    reviews: 328,
    discount: 28
  }
];

export function TravelDeals() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 380;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-100 text-sky-600 text-sm font-medium mb-4">
            <Clock className="w-4 h-4" />
            Limited Time Offers
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
            Today&apos;s Best Travel Deals
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Hand-picked offers from top travel providers. Book now for the lowest prices!
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Navigation Arrows */}
          <button 
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all border border-slate-200 group"
          >
            <ChevronLeft className="h-6 w-6 text-slate-600 group-hover:text-sky-500" />
          </button>
          <button 
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all border border-slate-200 group"
          >
            <ChevronRight className="h-6 w-6 text-slate-600 group-hover:text-sky-500" />
          </button>

          {/* Deals Scroll Container */}
          <div 
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {deals.map((deal, index) => (
              <Card 
                key={deal.id} 
                className="flex-shrink-0 w-[340px] overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-2 snap-start group cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Image */}
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={deal.image}
                    alt={deal.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Discount Badge */}
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                    {deal.discount}% OFF
                  </div>

                  {/* Type Badge */}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-medium px-3 py-1 rounded-full">
                    {deal.type}
                  </div>

                  {/* Location */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/90">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">{deal.location}</span>
                  </div>
                </div>

                <CardContent className="p-5">
                  {/* Title */}
                  <h3 className="text-base font-semibold text-slate-800 mb-3 line-clamp-2 group-hover:text-sky-600 transition-colors">
                    {deal.title}
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-semibold text-slate-700">{deal.rating}</span>
                    </div>
                    <span className="text-sm text-slate-400">({deal.reviews} reviews)</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-400 line-through">{deal.originalPrice}</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent">
                        {deal.price}
                      </p>
                      <p className="text-xs text-slate-400">per person</p>
                    </div>
                    <Button 
                      className="bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-600 hover:to-violet-600 text-white text-sm font-semibold px-6 rounded-xl transition-all hover:shadow-glow"
                    >
                      View Deal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* View All Link */}
        <div className="text-center mt-10">
          <Button 
            variant="link" 
            className="text-sky-600 hover:text-sky-700 font-semibold text-lg"
          >
            View All Travel Deals →
          </Button>
        </div>
      </div>
    </section>
  );
}
