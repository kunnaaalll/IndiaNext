'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc-client';
import { 
  MapPin, 
  Table as TableIcon, 
  Plus, 
  Trash2, 
  Search, 
  RefreshCw,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Monitor
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Venue {
  id: string;
  name: string;
}

interface TeamLogistics {
  id: string;
  name: string;
  shortCode: string;
  track: string;
  venueId: string | null;
  tableNumber: string | null;
  attendance: string;
}

export function VenueManagement() {
  const [activeTab, setActiveTab] = useState<'assignment' | 'settings'>('assignment');
  const [search, setSearch] = useState('');
  const [newVenueName, setNewVenueName] = useState('');
  const [updatingTeamId, setUpdatingTeamId] = useState<string | null>(null);

  // Queries
  const { data: venues, refetch: refetchVenues, isLoading: loadingVenues } = trpc.admin.getVenues.useQuery();
  const { data: teamsData, isLoading: loadingTeams, refetch: refetchTeams } = trpc.admin.getTeams.useQuery({
    status: 'SHORTLISTED',
    pageSize: 100, // Show all shortlisted teams
    search: search || undefined
  });

  // Mutations
  const createVenueMutation = trpc.admin.createVenue.useMutation({
    onSuccess: () => {
      toast.success('Venue created successfully');
      setNewVenueName('');
      refetchVenues();
    },
    onError: (e) => toast.error(e.message)
  });

  const deleteVenueMutation = trpc.admin.deleteVenue.useMutation({
    onSuccess: () => {
      toast.success('Venue deleted');
      refetchVenues();
    },
    onError: (e) => toast.error(e.message)
  });

  const updateLogisticsMutation = trpc.admin.updateTeamLogistics.useMutation({
    onSuccess: () => {
      toast.success('Logistics updated');
      setUpdatingTeamId(null);
      refetchTeams();
    },
    onError: (e) => {
      toast.error(e.message);
      setUpdatingTeamId(null);
    }
  });

  const shortlistedTeams = teamsData?.teams || [];

  const handleUpdateLogistics = (teamId: string, venueId: string | null, tableNumber: string | null) => {
    setUpdatingTeamId(teamId);
    updateLogisticsMutation.mutate({ teamId, venueId, tableNumber });
  };

  return (
    <div className="space-y-6">
      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('assignment')}
          className={`px-4 py-2 text-[10px] font-mono font-bold tracking-widest rounded-lg transition-all ${
            activeTab === 'assignment'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          TEAM_ASSIGNMENTS
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-[10px] font-mono font-bold tracking-widest rounded-lg transition-all ${
            activeTab === 'settings'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          VENUE_SETTINGS
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'assignment' ? (
          <motion.div
            key="assignment"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* ── Assignment Tools ── */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0A0A0A] p-4 rounded-xl border border-white/[0.06]">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                <input
                  type="text"
                  placeholder="SEARCH_BY_TEAM_OR_CODE..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-lg pl-10 pr-4 py-2 text-[11px] font-mono text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => refetchTeams()}
                  className="p-2 text-gray-500 hover:text-orange-400 border border-white/5 rounded-lg hover:bg-orange-500/5 transition-all"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingTeams ? 'animate-spin' : ''}`} />
                </button>
                <div className="h-8 w-px bg-white/5 mx-2" />
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-mono font-bold text-orange-500 leading-none">
                    {shortlistedTeams.length} SHORTLISTED
                  </span>
                  <span className="text-[9px] font-mono text-gray-600 tracking-tighter mt-1">
                    TOTAL_TEAMS_AWAITING_MAP
                  </span>
                </div>
              </div>
            </div>

            {/* ── Teams Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingTeams ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 bg-white/[0.02] border border-white/[0.04] rounded-2xl animate-pulse" />
                ))
              ) : shortlistedTeams.length > 0 ? (
                shortlistedTeams.map((team) => (
                  <TeamLogisticsCard 
                    key={team.id}
                    team={team}
                    venues={venues || []}
                    isUpdating={updatingTeamId === team.id}
                    onUpdate={handleUpdateLogistics}
                  />
                ))
              ) : (
                <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-2xl">
                  <Monitor className="h-10 w-10 text-gray-800 mx-auto mb-4" />
                  <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">No shortlisted teams found</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* ── Create Venue ── */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-[#0A0A0A] p-6 rounded-2xl border border-white/[0.06] flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center border border-orange-500/20">
                    <Plus className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-black text-white uppercase tracking-widest">New_Venue</h3>
                    <p className="text-[9px] font-mono text-gray-600 uppercase">Create_physical_location</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-gray-500 uppercase px-1">Venue_Name</label>
                    <input
                      type="text"
                      placeholder="e.g. SEMINAR_HALL_1"
                      value={newVenueName}
                      onChange={(e) => setNewVenueName(e.target.value.toUpperCase())}
                      className="w-full bg-black/60 border border-white/[0.08] rounded-xl px-4 py-3 text-[11px] font-mono text-white focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all uppercase"
                    />
                  </div>
                  <button
                    onClick={() => createVenueMutation.mutate({ name: newVenueName })}
                    disabled={createVenueMutation.isPending || !newVenueName}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 active:scale-95 disabled:opacity-40 rounded-xl text-[10px] text-white font-black tracking-[0.2em] uppercase transition-all shadow-xl shadow-orange-900/10"
                  >
                    {createVenueMutation.isPending ? 'CREATING...' : 'REGISTER_VENUE'}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Venues List ── */}
            <div className="lg:col-span-2 bg-[#0A0A0A] rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-xs font-mono font-black text-gray-400 uppercase tracking-widest">Registered_Venues</h3>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {loadingVenues ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse bg-white/[0.01]" />
                  ))
                ) : venues?.length ? (
                  venues.map((v: Venue) => (
                    <div key={v.id} className="p-4 flex items-center justify-between group hover:bg-white/[0.01] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5">
                          <MapPin className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-xs font-mono font-bold text-gray-200">{v.name}</p>
                          <p className="text-[9px] font-mono text-gray-600 mt-0.5 uppercase tracking-tighter">ID: {v.id.slice(-8)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Delete this venue? This action cannot be undone.')) {
                            deleteVenueMutation.mutate({ id: v.id });
                          }
                        }}
                        className="p-2 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center">
                    <MapPin className="h-8 w-8 text-gray-800 mx-auto mb-2" />
                    <p className="text-xs font-mono text-gray-600">No venues registered yet</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TeamLogisticsCardProps {
  team: TeamLogistics;
  venues: Venue[];
  isUpdating: boolean;
  onUpdate: (teamId: string, venueId: string | null, tableNumber: string | null) => void;
}

function TeamLogisticsCard({ team, venues, isUpdating, onUpdate }: TeamLogisticsCardProps) {
  const [selectedVenueId, setSelectedVenueId] = useState<string>(team.venueId || 'none');
  const [tableNo, setTableNo] = useState(team.tableNumber || '');

  const hasChanges = (selectedVenueId === 'none' ? null : selectedVenueId) !== (team.venueId || null) || 
                     (tableNo || null) !== (team.tableNumber || null);

  return (
    <div className={`p-5 bg-black border rounded-2xl transition-all duration-300 ${
      team.venueId ? 'border-orange-500/20 bg-orange-500/[0.02]' : 'border-white/[0.06]'
    }`}>
      {/* Team Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-[13px] font-mono font-black text-white truncate">{team.name}</h4>
            {team.venueId && <CheckCircle2 className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
          </div>
          <p className="text-[9px] font-mono text-gray-600 tracking-widest">{team.shortCode} • {team.track.replace('_', ' ')}</p>
        </div>
        <div className={`px-2 py-0.5 rounded text-[9px] font-mono font-black border ${
          team.attendance === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-gray-600 border-white/10'
        }`}>
          {team.attendance === 'PRESENT' ? 'CHECKED_IN' : 'AWAITING'}
        </div>
      </div>

      {/* Select Venue */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[9px] font-mono text-gray-500 uppercase px-1">
            <MapPin className="h-2.5 w-2.5" /> Venue_Assignment
          </label>
          <select
            value={selectedVenueId}
            onChange={(e) => setSelectedVenueId(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:ring-1 focus:ring-orange-500/40"
          >
            <option value="none">NOT_ASSIGNED</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[9px] font-mono text-gray-500 uppercase px-1">
            <TableIcon className="h-2.5 w-2.5" /> Table_Number
          </label>
          <input
            type="text"
            placeholder="e.g. T-42"
            value={tableNo}
            onChange={(e) => setTableNo(e.target.value.toUpperCase())}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:ring-1 focus:ring-orange-500/40 uppercase"
          />
        </div>

        <button
          onClick={() => onUpdate(team.id, selectedVenueId === 'none' ? null : selectedVenueId, tableNo || null)}
          disabled={!hasChanges || isUpdating}
          className={`w-full py-2.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${
            hasChanges 
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/10' 
              : 'bg-white/5 text-gray-700 cursor-not-allowed'
          }`}
        >
          {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
          {isUpdating ? 'UPDATING...' : 'SAVE_LOGISTICS'}
        </button>
      </div>
    </div>
  );
}
