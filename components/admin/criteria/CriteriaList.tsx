'use client';

import { useState } from 'react';
import { Edit, Trash2, Eye, EyeOff, GripVertical, AlertTriangle } from 'lucide-react';
import { trpc } from '@/lib/trpc-client';
import { toast } from 'sonner';

interface Criterion {
  id: string;
  criterionId: string;
  name: string;
  description: string;
  weight: number;
  maxPoints: number;
  order: number;
  isActive: boolean;
  track: string;
}

interface CriteriaListProps {
  criteria: Criterion[];
  isLoading: boolean;
  track: 'IDEA_SPRINT' | 'BUILD_STORM';
  onEdit: (criterion: Criterion) => void;
  onRefresh: () => void;
}

export function CriteriaList({ criteria, isLoading, track, onEdit, onRefresh }: CriteriaListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const deleteMutation = trpc.admin.deleteCriterion.useMutation();
  const toggleMutation = trpc.admin.toggleCriterion.useMutation();

  const handleDelete = async (criterion: Criterion) => {
    if (
      !confirm(`Are you sure you want to delete "${criterion.name}"? This action cannot be undone.`)
    ) {
      return;
    }

    setDeletingId(criterion.id);
    try {
      await deleteMutation.mutateAsync({ id: criterion.id });
      toast.success('Criterion deleted successfully');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete criterion');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (criterion: Criterion) => {
    setTogglingId(criterion.id);
    try {
      await toggleMutation.mutateAsync({
        id: criterion.id,
        isActive: !criterion.isActive,
      });
      toast.success(`Criterion ${criterion.isActive ? 'deactivated' : 'activated'} successfully`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle criterion');
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#0A0A0A] rounded-lg border border-white/[0.06] p-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-white/[0.04] rounded w-1/3 mb-2" />
              <div className="h-3 bg-white/[0.02] rounded w-2/3 mb-2" />
              <div className="h-2 bg-white/[0.02] rounded w-1/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (criteria.length === 0) {
    return (
      <div className="bg-[#0A0A0A] rounded-lg border border-white/[0.06] p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-gray-600 mx-auto mb-3" />
        <h3 className="text-sm font-mono font-bold text-gray-400 mb-2">NO CRITERIA DEFINED</h3>
        <p className="text-xs text-gray-600">
          Add judging criteria to enable scoring for{' '}
          {track === 'IDEA_SPRINT' ? 'IdeaSprint' : 'BuildStorm'} teams.
        </p>
      </div>
    );
  }

  // Sort criteria by order
  const sortedCriteria = [...criteria].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-[#0A0A0A] rounded-lg border border-white/[0.06] overflow-hidden">
      <div className="divide-y divide-white/[0.03]">
        {sortedCriteria.map((criterion) => (
          <div
            key={criterion.id}
            className={`p-4 transition-colors ${
              !criterion.isActive ? 'opacity-60 bg-white/[0.01]' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Drag Handle */}
              <div className="pt-1">
                <GripVertical className="h-4 w-4 text-gray-600 cursor-move" />
              </div>

              {/* Order Number */}
              <div className="flex-shrink-0 pt-1">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-xs font-mono font-bold rounded border ${
                    track === 'IDEA_SPRINT'
                      ? 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10'
                      : 'text-orange-400 border-orange-500/20 bg-orange-500/10'
                  }`}
                >
                  {criterion.order}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-200 truncate">
                        {criterion.name}
                      </h3>
                      {!criterion.isActive && (
                        <span className="inline-flex text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-gray-500/10 text-gray-400 border-gray-500/20">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                      {criterion.description}
                    </p>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
                      <span>Weight: {criterion.weight}%</span>
                      <span>Max Points: {criterion.maxPoints}</span>
                      <span>ID: {criterion.criterionId}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(criterion)}
                      disabled={togglingId === criterion.id}
                      className="p-1.5 text-gray-600 hover:text-gray-400 rounded-md hover:bg-white/[0.05] transition-all disabled:opacity-50"
                      title={criterion.isActive ? 'Deactivate criterion' : 'Activate criterion'}
                    >
                      {criterion.isActive ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => onEdit(criterion)}
                      className="p-1.5 text-gray-600 hover:text-blue-400 rounded-md hover:bg-blue-500/5 transition-all"
                      title="Edit criterion"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(criterion)}
                      disabled={deletingId === criterion.id}
                      className="p-1.5 text-gray-600 hover:text-red-400 rounded-md hover:bg-red-500/5 transition-all disabled:opacity-50"
                      title="Delete criterion"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
