import Link from 'next/link';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, Send } from 'lucide-react';

const footerLinks = {
  destinations: [
    'Domestic Travel Deals',
    'Europe Travel Deals',
    'Caribbean Travel Deals',
    'Mexico Travel Deals',
    'Exotic Travel Deals',
    'Articles',
    'Travel Tips'
  ],
  types: [
    'Vacation Deals',
    'Hotel Deals',
    'Cruise Deals',
    'Airfare Deals',
    'Last Minute Travel Deals',
    'Find more Travel Deals',
    'Some taxes/fees additional'
  ],
  company: [
    'About Us',
    'Contact Us',
    'FAQs',
    'Advertise',
    'Terms of Use',
    'Privacy Policy'
  ]
};

export function Footer() {
  return (
    <footer className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold font-heading mb-2">Get Travel Deals in Your Inbox</h3>
              <p className="text-slate-400">Subscribe to receive exclusive deals and travel inspiration</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <input 
                type="email" 
                placeholder="Enter your email"
                className="flex-1 md:w-72 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent backdrop-blur-sm transition-all"
              />
              <button className="px-6 py-3 bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-600 hover:to-violet-600 rounded-xl font-semibold transition-all hover:shadow-glow flex items-center gap-2">
                <Send className="w-4 h-4" />
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Deals by Destinations */}
          <div className="lg:col-span-1">
            <h3 className="font-bold text-lg mb-4 text-sky-400">Destinations</h3>
            <ul className="space-y-3">
              {footerLinks.destinations.map((link) => (
                <li key={link}>
                  <Link 
                    href="/search" 
                    className="text-sm text-slate-300 hover:text-white hover:pl-1 transition-all duration-200"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Deals by Type */}
          <div className="lg:col-span-1">
            <h3 className="font-bold text-lg mb-4 text-violet-400">Travel Types</h3>
            <ul className="space-y-3">
              {footerLinks.types.map((link) => (
                <li key={link}>
                  <Link 
                    href="/search" 
                    className="text-sm text-slate-300 hover:text-white hover:pl-1 transition-all duration-200"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Info */}
          <div className="lg:col-span-1">
            <h3 className="font-bold text-lg mb-4 text-amber-400">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link}>
                  <Link 
                    href="/search" 
                    className="text-sm text-slate-300 hover:text-white hover:pl-1 transition-all duration-200"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="lg:col-span-2">
            <h3 className="font-bold text-lg mb-4">Contact Us</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Phone</p>
                  <p className="font-medium">1-800-BOOMER-TRIP</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Email</p>
                  <p className="font-medium">info@babyboomertrips.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Address</p>
                  <p className="font-medium">123 Travel Lane, Miami, FL 33101</p>
                </div>
              </div>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3 mt-6">
              <a href="#" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-sky-500 transition-all hover:scale-110">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-sky-400 transition-all hover:scale-110">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-pink-500 transition-all hover:scale-110">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-red-500 transition-all hover:scale-110">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <div>
                <span className="text-lg font-bold">Dunhill</span>
                <span className="text-lg font-bold text-sky-400">TravelDeals</span>
                <p className="text-xs text-slate-400">TRAVEL MORE. SPEND LESS.</p>
              </div>
            </div>

            <p className="text-sm text-slate-400">
              Copyright © 2024 BabyBoomerTrips. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
