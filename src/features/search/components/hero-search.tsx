'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Calendar, Users, Plane, Building2, Ship, Car, Palmtree } from 'lucide-react';

export function HeroSearch() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('vacations');
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('2 Travelers');
  const [travelers, setTravelers] = useState('2 Travelers');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const tabs = [
    { id: 'vacations', label: 'Vacations', icon: Palmtree },
    { id: 'hotels', label: 'Hotels', icon: Building2 },
    { id: 'cruises', label: 'Cruises', icon: Ship },
    { id: 'flights', label: 'Flights', icon: Plane },
    { id: 'cars', label: 'Cars', icon: Car },
  ];

  const handleSearch = () => {
    if (destination) {
      const params = new URLSearchParams({
        q: destination,
        ...(checkIn && { checkin: checkIn }),
        ...(checkOut && { checkout: checkOut }),
      });
      router.push(`/search?${params.toString()}`);
    }
  };

  return (
    <div className="relative w-full min-h-[600px] md:min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1920&q=80')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/30 to-slate-900/60" />
        {/* Aurora Effect Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-violet-500/10 to-amber-500/10 animate-pulse-slow" />
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-sky-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-40 right-20 w-32 h-32 bg-violet-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-amber-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      {/* Search Form Container */}
      <div className="relative z-10 w-full px-4 py-12">
        {/* Hero Text */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            Discover Your Next Adventure
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            Premium travel experiences curated for the modern explorer
          </p>
        </div>

        {/* Glass Card Search Form */}
        <div className="max-w-5xl mx-auto bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-slide-up">
          {/* Tabs */}
          <div className="flex bg-white/5 backdrop-blur-sm border-b border-white/10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Fields */}
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* From */}
              <div className="relative group">
                <label className="block text-xs text-slate-300 mb-1 ml-1">Where From?</label>
                <div className="relative">
                  <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-sky-400" />
                  <Input
                    placeholder="Origin city"
                    className="pl-11 py-3 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 focus:border-sky-400 backdrop-blur-sm transition-all"
                  />
                </div>
              </div>

              {/* To */}
              <div className="relative group">
                <label className="block text-xs text-slate-300 mb-1 ml-1">Going to</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-violet-400" />
                  <Input
                    placeholder="Destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="pl-11 py-3 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 focus:border-violet-400 backdrop-blur-sm transition-all"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="relative group">
                <label className="block text-xs text-slate-300 mb-1 ml-1">Check-in / Check-out</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-400" />
                  <Input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="pl-11 py-3 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 focus:border-amber-400 backdrop-blur-sm transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Travelers */}
              <div className="relative group">
                <label className="block text-xs text-slate-300 mb-1 ml-1">Travelers</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-sky-400" />
                  <select
                    value={travelers}
                    onChange={(e) => setTravelers(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent backdrop-blur-sm transition-all appearance-none cursor-pointer"
                  >
                    <option className="text-slate-900">1 Traveler</option>
                    <option className="text-slate-900" selected>2 Travelers</option>
                    <option className="text-slate-900">3 Travelers</option>
                    <option className="text-slate-900">4 Travelers</option>
                    <option className="text-slate-900">5+ Travelers</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              className="w-full bg-gradient-to-r from-sky-500 via-violet-500 to-amber-500 hover:from-sky-600 hover:via-violet-600 hover:to-amber-600 text-white font-semibold py-4 text-lg rounded-xl transition-all hover:shadow-glow hover:scale-[1.02] flex items-center justify-center gap-3"
            >
              <Search className="h-6 w-6" />
              Compare Vacations
            </Button>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-white/70 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-sm">🏆</span>
            </div>
            <span className="text-sm font-medium">Best Price Guarantee</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-sm">🛡️</span>
            </div>
            <span className="text-sm font-medium">Secure Booking</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-sm">⭐</span>
            </div>
            <span className="text-sm font-medium">4.8/5 Guest Rating</span>
          </div>
        </div>
      </div>
    </div>
  );
}
