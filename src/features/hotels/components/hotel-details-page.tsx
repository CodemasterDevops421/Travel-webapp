'use client';

import {
    ArrowLeft,
    MapPin,
    Heart,
    Share2,
    Wifi,
    Utensils,
    Car,
    Waves,
    Dumbbell,
    Sparkles,
    Star
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/shared/lib/utils';
import { PropertyPreview } from '@/features/search/hooks/use-property-preview';

interface HotelDetailsProps {
    hotel: PropertyPreview & { images?: string[], address?: string };
}

export function HotelDetailsPage({ hotel }: HotelDetailsProps) {
    // Fallback images if none provided
    const images = hotel.images && hotel.images.length >= 5 ? hotel.images : [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1590490360182-f33cfe623d9d?auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80'
    ];

    return (
        <main className="mx-auto max-w-7xl px-4 py-6 space-y-8">
            {/* Breadcrumb & Navigation */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-primary flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" />
                    See all properties
                </Link>
            </div>

            {/* Header Section */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold font-heading">{hotel.name}</h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex">{[...Array(Math.floor(hotel.starRating || 5))].map((_, i) => <Star key={i} className="h-4 w-4 fill-orange-400 text-orange-400" />)}</div>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {hotel.address || 'Central District'}, {hotel.city}
                        </span>
                        <Button variant="link" className="h-auto p-0 text-primary underline">Show Map</Button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="rounded-full gap-2 border-border/60">
                        <Heart className="h-4 w-4" />
                        Save
                    </Button>
                    <Button variant="outline" className="rounded-full gap-2 border-border/60">
                        <Share2 className="h-4 w-4" />
                        Share
                    </Button>
                    <Button className="rounded-full bg-[#aa15ef] hover:bg-[#9013cb] shadow-electric-md text-white font-semibold">
                        Reserve
                    </Button>
                </div>
            </div>

            {/* Mosaic Gallery */}
            <div className="grid h-[400px] grid-cols-4 gap-2 overflow-hidden rounded-[2rem]">
                <div className="col-span-2 row-span-2 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={images[0]} alt="Main view" className="h-full w-full object-cover" />
                </div>
                <div className="col-span-1 row-span-1 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={images[1]} alt="Room view" className="h-full w-full object-cover" />
                </div>
                <div className="col-span-1 row-span-1 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={images[2]} alt="Lobby" className="h-full w-full object-cover" />
                </div>
                <div className="col-span-1 row-span-1 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={images[3]} alt="Pool" className="h-full w-full object-cover" />
                </div>
                <div className="col-span-1 row-span-1 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={images[4]} alt="Amenities" className="h-full w-full object-cover" />
                    <Button variant="secondary" className="absolute bottom-4 right-4 rounded-full text-xs shadow-md">
                        Show all pictures
                    </Button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-border">
                <div className="flex gap-8 text-sm font-medium overflow-x-auto">
                    {['Overview', 'Facilities', 'Rooms', 'Reviews', 'Description', 'Ask AI'].map((tab, i) => (
                        <button key={tab} className={cn("pb-3 border-b-2 transition-colors whitespace-nowrap", i === 0 ? "border-[#aa15ef] text-[#aa15ef]" : "border-transparent text-muted-foreground hover:text-foreground")}>
                            {tab} {tab === 'Ask AI' && <Badge variant="secondary" className="ml-1 bg-gradient-to-r from-[#aa15ef] to-fuchsia-500 text-white border-0 text-[10px] px-1.5 py-0">Beta</Badge>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Smart Highlights */}
            <section>
                <h2 className="mb-4 text-xl font-bold font-heading">Smart highlights</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-5 w-5 text-[#aa15ef]" />
                            <h3 className="font-semibold text-foreground">Parisian charm awaits</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Nestled in the vibrant 2nd arrondissement, this hotel places you steps from the iconic Palais Royal and enchanting gardens.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Heart className="h-5 w-5 text-[#aa15ef]" />
                            <h3 className="font-semibold text-foreground">Unforgettable guest experiences</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Delight in personalized service and a warm atmosphere, complemented by complimentary snacks throughout the day.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Dumbbell className="h-5 w-5 text-[#aa15ef]" />
                            <h3 className="font-semibold text-foreground">Stylish comfort</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Enjoy modern amenities in elegantly designed rooms, each featuring unique Parisian touches ensuring a cozy retreat.
                        </p>
                    </div>
                </div>
            </section>

            {/* Popular Facilities & Reviews Grid */}
            <div className="grid gap-12 lg:grid-cols-[2fr,1fr]">
                <div className="space-y-8">
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold font-heading">Popular facilities</h2>
                            <Button variant="link" className="text-muted-foreground text-xs">See all facilities</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-8 md:grid-cols-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2"><div className="p-1.5 bg-slate-100 rounded-full"><Wifi className="h-4 w-4" /></div> Free WiFi</div>
                            <div className="flex items-center gap-2"><div className="p-1.5 bg-slate-100 rounded-full"><Utensils className="h-4 w-4" /></div> Restaurant</div>
                            <div className="flex items-center gap-2"><div className="p-1.5 bg-slate-100 rounded-full"><Car className="h-4 w-4" /></div> Parking</div>
                            <div className="flex items-center gap-2"><div className="p-1.5 bg-slate-100 rounded-full"><Waves className="h-4 w-4" /></div> Pool</div>
                        </div>
                    </section>

                    <Separator />

                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold font-heading">Review highlights</h2>
                            <Button variant="link" className="text-muted-foreground text-xs">Read all reviews</Button>
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-3 py-1 text-sm font-medium border-0">
                                &quot;Great Location&quot;
                            </Badge>
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-3 py-1 text-sm font-medium border-0">
                                &quot;Excellent Service&quot;
                            </Badge>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium"><span>Cleanliness</span><span>9.2</span></div>
                                <Progress value={92} className="h-2" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium"><span>Service</span><span>9.0</span></div>
                                <Progress value={90} className="h-2" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium"><span>Comfort</span><span>8.8</span></div>
                                <Progress value={88} className="h-2" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium"><span>Location</span><span>9.5</span></div>
                                <Progress value={95} className="h-2" />
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column / Sticky Booking Widget removed for now to match screenshot flow */}
            </div>
        </main>
    );
}
