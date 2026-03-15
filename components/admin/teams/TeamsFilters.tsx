'use client';

import { Search, X, Trophy, Award } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAdminRole } from '@/components/admin/AdminRoleContext';

interface FiltersState {
  status: string;
  track: string;
  college: string;
  search: string;
  sortBy: string;
  sortOrder: string;
  rankingMode?: string;
}

interface TeamsFiltersProps {
  filters: FiltersState;
  onChange: (filters: Partial<FiltersState & { page: number }>) => void;
}

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WAITLISTED', label: 'Waitlisted' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
];

// Judge-specific status options (only approved and shortlisted)
const judgeStatusOptions = [
  { value: 'all', label: 'All Eligible Teams' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
];

const trackOptions = [
  { value: 'all', label: 'All Tracks' },
  { value: 'IDEA_SPRINT', label: 'Idea Sprint' },
  { value: 'BUILD_STORM', label: 'Build Storm' },
  { value: 'BOTH', label: 'Applied Both Tracks' },
];

const sortOptions = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'name', label: 'Team Name' },
  { value: 'status', label: 'Status' },
  { value: 'college', label: 'College' },
];

const judgeSortOptions = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'name', label: 'Team Name' },
  { value: 'status', label: 'Status' },
  { value: 'college', label: 'College' },
  { value: 'ideasprintRanking', label: 'IdeaSprint Ranking' },
  { value: 'buildstormRanking', label: 'BuildStorm Ranking' },
  { value: 'overallScore', label: 'Overall Score' },
];

const rankingModeOptions = [
  { value: 'all', label: 'All Teams' },
  { value: 'ideasprint', label: 'IdeaSprint Rankings' },
  { value: 'buildstorm', label: 'BuildStorm Rankings' },
  { value: 'combined', label: 'Combined Rankings' },
];

export function TeamsFilters({ filters, onChange }: TeamsFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const { isJudge } = useAdminRole();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onChange({ search: searchInput, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Auto-filter for judges to only show approved and shortlisted teams
  useEffect(() => {
    if (isJudge && filters.status === 'all') {
      // Let the backend handle judge filtering, don't override here
      // The backend will automatically filter to approved and shortlisted teams for judges
    }
  }, [isJudge, filters.status, onChange]);

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.track !== 'all' ||
    filters.search ||
    filters.college ||
    (isJudge && filters.rankingMode !== 'all');

  const resetFilters = () => {
    setSearchInput('');
    const baseFilters = {
      status: 'all', // Let backend handle judge filtering
      track: 'all',
      college: '',
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
    };

    if (isJudge) {
      onChange({ ...baseFilters, rankingMode: 'all' });
    } else {
      onChange(baseFilters);
    }
  };

  const selectClass =
    'px-3 py-2 text-xs font-mono bg-[#0A0A0A] border border-white/[0.06] rounded-md text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/30 cursor-pointer appearance-none';

  const currentStatusOptions = isJudge ? judgeStatusOptions : statusOptions;
  const currentSortOptions = isJudge ? judgeSortOptions : sortOptions;

  return (
    <div className="bg-[#0A0A0A] rounded-lg border border-white/[0.06] p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600" />
          <input
            type="text"
            placeholder="Search teams, members, or colleges..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-mono bg-transparent border border-white/[0.06] rounded-md text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/30"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                onChange({ search: '', page: 1 });
              }}
              title="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Judge Ranking Mode Filter */}
        {isJudge && (
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <select
              value={filters.rankingMode || 'all'}
              onChange={(e) => {
                const newRankingMode = e.target.value;
                const updates: any = { rankingMode: newRankingMode, page: 1 };

                // Auto-set track filter based on ranking mode
                if (newRankingMode === 'ideasprint') {
                  updates.track = 'IDEA_SPRINT';
                  updates.sortBy = 'ideasprintRanking';
                  updates.sortOrder = 'desc';
                } else if (newRankingMode === 'buildstorm') {
                  updates.track = 'BUILD_STORM';
                  updates.sortBy = 'buildstormRanking';
                  updates.sortOrder = 'desc';
                } else if (newRankingMode === 'combined') {
                  updates.track = 'all';
                  updates.sortBy = 'overallScore';
                  updates.sortOrder = 'desc';
                }

                onChange(updates);
              }}
              title="Filter by ranking mode"
              className={selectClass}
            >
              {rankingModeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value, page: 1 })}
          title="Filter by status"
          className={selectClass}
        >
          {currentStatusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Track Filter */}
        <select
          value={filters.track}
          onChange={(e) => onChange({ track: e.target.value, page: 1 })}
          title="Filter by track"
          className={selectClass}
        >
          {trackOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={filters.sortBy}
          onChange={(e) => onChange({ sortBy: e.target.value })}
          className={selectClass}
          aria-label="Sort by"
        >
          {currentSortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Sort Order Toggle */}
        <button
          type="button"
          onClick={() =>
            onChange({
              sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
            })
          }
          className="px-3 py-2 text-xs font-mono border border-white/[0.06] rounded-md text-gray-400 hover:text-orange-400 hover:border-orange-500/20 transition-all"
          title={filters.sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
          aria-label={filters.sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
        >
          {filters.sortOrder === 'asc' ? '↑ ASC' : '↓ DESC'}
        </button>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-2 text-xs font-mono text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 rounded-md transition-all flex items-center gap-1"
            aria-label="Reset filters"
          >
            <X className="h-3 w-3" />
            RESET
          </button>
        )}
      </div>

      {/* Judge Mode Indicator */}
      {isJudge && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
              <Award className="h-3.5 w-3.5" />
              <span>JUDGE MODE: Only approved and shortlisted teams are shown for scoring</span>
            </div>
            {filters.rankingMode && filters.rankingMode !== 'all' && (
              <div className="flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                <Trophy className="h-3 w-3" />
                <span>
                  {filters.rankingMode === 'ideasprint' && 'IdeaSprint Rankings Active'}
                  {filters.rankingMode === 'buildstorm' && 'BuildStorm Rankings Active'}
                  {filters.rankingMode === 'combined' && 'Combined Rankings Active'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
