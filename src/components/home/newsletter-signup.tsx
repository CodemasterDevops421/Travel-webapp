'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter signup
    console.log('Newsletter signup:', email);
    setEmail('');
  };

  return (
    <section className="py-12 px-4 bg-sky-400">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Left side - Image */}
          <div className="w-full md:w-1/2">
            <img
              src="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500&h=300&fit=crop"
              alt="Happy travelers"
              className="w-full h-48 md:h-64 object-cover rounded-lg"
            />
          </div>

          {/* Right side - Form */}
          <div className="w-full md:w-1/2 text-center md:text-left">
            <h2 className="text-3xl font-bold text-white mb-4">
              Newsletter Sign up
            </h2>
            <p className="text-white/90 mb-6 text-sm">
              Our editors have learned that DunhillTravelDeals.com has the most exciting travel deals. 
              Get great travel deals in your inbox!
            </p>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-white border-0"
                required
              />
              <Button 
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-6"
              >
                GO
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
