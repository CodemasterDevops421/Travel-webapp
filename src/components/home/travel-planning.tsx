'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

const categories = [
  {
    id: 'cruise',
    title: 'Cruise',
    image: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=600&h=400&fit=crop',
    icon: '🚢',
    color: 'from-sky-500 to-blue-600',
    description: 'Ocean & River'
  },
  {
    id: 'hotels',
    title: 'Hotels',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop',
    icon: '🏨',
    color: 'from-violet-500 to-purple-600',
    description: 'Luxury & Boutique'
  },
  {
    id: 'vacations',
    title: 'Vacations',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop',
    icon: '🏖️',
    color: 'from-amber-500 to-orange-600',
    description: 'All-Inclusive'
  },
  {
    id: 'lastminute',
    title: 'Last Minute',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop',
    icon: '⚡',
    color: 'from-red-500 to-rose-600',
    description: 'Quick Getaways'
  },
  {
    id: 'bydestination',
    title: 'By Destination',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=400&fit=crop',
    icon: '🌍',
    color: 'from-emerald-500 to-teal-600',
    description: 'Explore World'
  }
];

export function TravelPlanning() {
  return (
    <section className="py-16 px-4 bg-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_50%,rgba(14,165,233,0.1),transparent_50%)]" />
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_50%,rgba(139,92,246,0.1),transparent_50%)]" />
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
            Start Your Travel Planning
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Choose how you want to travel and let us find the perfect getaway for you
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {categories.map((category, index) => (
            <Card 
              key={category.id} 
              className="group overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-0"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative h-40 md:h-48 overflow-hidden">
                <img
                  src={category.image}
                  alt={category.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t ${category.color} opacity-60 group-hover:opacity-70 transition-opacity`} />
                
                {/* Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                  <span className="text-4xl mb-2 transform group-hover:scale-125 transition-transform duration-300">
                    {category.icon}
                  </span>
                  <h3 className="text-lg font-bold mb-1">{category.title}</h3>
                  <p className="text-sm text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                    {category.description}
                  </p>
                </div>

                {/* Arrow Button */}
                <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Features Pills */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-sky-50 text-sky-600 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            Best Price Guarantee
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 text-violet-600 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            24/7 Support
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-600 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Free Cancellation
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-600 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Member Discounts
          </div>
        </div>
      </div>
    </section>
  );
}
