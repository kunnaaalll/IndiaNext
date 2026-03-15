'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc-client';
import { useAdminRole } from '@/components/admin/AdminRoleContext';
import { CriteriaManager } from '@/components/admin/criteria/CriteriaManager';
import { RefreshCw, Settings } from 'lucide-react';

export default function CriteriaManagementPage() {
  const { role } = useAdminRole();
  const [activeTrack, setActiveTrack] = useState<'IDEA_SPRINT' | 'BUILD_STORM'>('IDEA_SPRINT');
  
  const { data: criteriaData, isLoading, refetch } = trpc.admin.getCriteria.useQuery({
    track: activeTrack,
  });

  // Only admins and super admins can manage criteria
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Settings className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-mono font-bold text-gray-400 mb-2">ACCESS RESTRICTED</h2>
          <p className="text-sm text-gray-600">Only administrators can manage judging criteria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-mono font-bold text-white tracking-wider">
            JUDGING_CRITERIA
          </h1>
          <p className="text-[11px] font-mono text-gray-500 mt-1">
            Manage scoring criteria for both tracks
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono font-bold tracking-wider text-gray-400 bg-white/[0.03] border border-white/[0.06] rounded-md hover:text-orange-400 hover:border-orange-500/20 transition-all disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            REFRESH
          </button>
        </div>
      </div>

      {/* Track Selector */}
      <div className="bg-[#0A0A0A] rounded-lg border border-white/[0.06] p-4">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-[0.2em]">
            TRACK
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTrack('IDEA_SPRINT')}
              className={`px-3 py-1.5 text-xs font-mono font-bold tracking-wider rounded-md transition-all ${
                activeTrack === 'IDEA_SPRINT'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:text-cyan-400 hover:border-cyan-500/20'
              }`}
            >
              IDEA SPRINT
            </button>
            <button
              onClick={() => setActiveTrack('BUILD_STORM')}
              className={`px-3 py-1.5 text-xs font-mono font-bold tracking-wider rounded-md transition-all ${
                activeTrack === 'BUILD_STORM'
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  : 'text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:text-orange-400 hover:border-orange-500/20'
              }`}
            >
              BUILD STORM
            </button>
          </div>
        </div>
      </div>

      {/* Criteria Manager */}
      <CriteriaManager
        track={activeTrack}
        criteria={criteriaData?.criteria || []}
        isLoading={isLoading}
        onRefresh={refetch}
      />
    </div>
  );
}