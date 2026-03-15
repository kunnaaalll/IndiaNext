'use client';

import { useState } from 'react';
import { CriteriaList } from './CriteriaList';
import { CriteriaForm } from './CriteriaForm';
import { Plus, AlertTriangle } from 'lucide-react';
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

interface CriteriaManagerProps {
  track: 'IDEA_SPRINT' | 'BUILD_STORM';
  criteria: Criterion[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function CriteriaManager({ track, criteria, isLoading, onRefresh }: CriteriaManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);

  const handleAddNew = () => {
    setEditingCriterion(null);
    setShowForm(true);
  };

  const handleEdit = (criterion: Criterion) => {
    setEditingCriterion(criterion);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCriterion(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCriterion(null);
    onRefresh();
    toast.success(editingCriterion ? 'Criterion updated successfully' : 'Criterion added successfully');
  };

  // Calculate total weight
  const totalWeight = criteria.filter(c => c.isActive).reduce((sum, c) => sum + c.weight, 0);
  const isWeightValid = totalWeight === 100;

  const trackLabel = track === 'IDEA_SPRINT' ? 'IdeaSprint' : 'BuildStorm';

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="bg-[#0A0A0A] rounded-lg border border-white/[0.06] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-mono font-bold text-white tracking-wider">
              {trackLabel.toUpperCase()} CRITERIA
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[11px] font-mono text-gray-500">
                {criteria.length} criteria • Total weight: {totalWeight}%
              </span>
              {!isWeightValid && (
                <div className="flex items-center gap-1 text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-[10px] font-mono">Weight must equal 100%</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleAddNew}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono font-bold tracking-wider rounded-md transition-all ${
              track === 'IDEA_SPRINT'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20'
                : 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            ADD CRITERION
          </button>
        </div>
      </div>

      {/* Weight Validation Alert */}
      {!isWeightValid && criteria.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm font-mono font-bold text-amber-400">WEIGHT VALIDATION ERROR</h3>
              <p className="text-xs text-gray-400 mt-1">
                Total weight is {totalWeight}%. Please adjust criteria weights to equal exactly 100%.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Criteria List */}
      <CriteriaList
        criteria={criteria}
        isLoading={isLoading}
        track={track}
        onEdit={handleEdit}
        onRefresh={onRefresh}
      />

      {/* Criteria Form Modal */}
      {showForm && (
        <CriteriaForm
          track={track}
          criterion={editingCriterion}
          existingCriteria={criteria}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}