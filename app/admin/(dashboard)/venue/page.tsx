'use client';

import { VenueManagement } from '@/components/admin/venue/VenueManagement';
import { MapPin } from 'lucide-react';

export default function VenuePage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-5 w-5 text-orange-400" />
            <h1 className="text-lg font-mono font-black tracking-widest text-white uppercase">
              Venue & Logistics
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-orange-500/10 text-orange-400 border-orange-500/25">
              Event_Day
            </span>
          </div>
          <p className="text-xs font-mono text-gray-500">
            Assign physical locations and table numbers to{' '}
            <span className="text-orange-400 font-bold tracking-widest">SHORTLISTED</span> teams.
          </p>
        </div>
      </div>

      {/* ── Venue Management UI ── */}
      <VenueManagement />
    </div>
  );
}
