'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
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

interface CriteriaFormProps {
  track: 'IDEA_SPRINT' | 'BUILD_STORM';
  criterion?: Criterion | null;
  existingCriteria: Criterion[];
  onClose: () => void;
  onSuccess: () => void;
}

export function CriteriaForm({
  track,
  criterion,
  existingCriteria,
  onClose,
  onSuccess,
}: CriteriaFormProps) {
  const [formData, setFormData] = useState({
    criterionId: '',
    name: '',
    description: '',
    weight: 10,
    maxPoints: 10,
    order: 1,
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = trpc.admin.createCriterion.useMutation();
  const updateMutation = trpc.admin.updateCriterion.useMutation();

  // Initialize form data
  useEffect(() => {
    if (criterion) {
      setFormData({
        criterionId: criterion.criterionId,
        name: criterion.name,
        description: criterion.description,
        weight: criterion.weight,
        maxPoints: criterion.maxPoints,
        order: criterion.order,
        isActive: criterion.isActive,
      });
    } else {
      // Set default order for new criterion
      const maxOrder = Math.max(0, ...existingCriteria.map((c) => c.order));
      setFormData((prev) => ({ ...prev, order: maxOrder + 1 }));
    }
  }, [criterion, existingCriteria]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.criterionId.trim()) {
      newErrors.criterionId = 'Criterion ID is required';
    } else if (!/^[a-z_]+$/.test(formData.criterionId)) {
      newErrors.criterionId = 'Criterion ID must contain only lowercase letters and underscores';
    } else if (
      existingCriteria.some((c) => c.criterionId === formData.criterionId && c.id !== criterion?.id)
    ) {
      newErrors.criterionId = 'Criterion ID already exists';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.weight < 1 || formData.weight > 100) {
      newErrors.weight = 'Weight must be between 1 and 100';
    }

    if (formData.maxPoints < 1 || formData.maxPoints > 100) {
      newErrors.maxPoints = 'Max points must be between 1 and 100';
    }

    if (formData.order < 1) {
      newErrors.order = 'Order must be at least 1';
    }

    // Check if total weight would exceed 100%
    const otherCriteriaWeight = existingCriteria
      .filter((c) => c.id !== criterion?.id && c.isActive)
      .reduce((sum, c) => sum + c.weight, 0);

    if (formData.isActive && otherCriteriaWeight + formData.weight > 100) {
      newErrors.weight = `Total weight would be ${otherCriteriaWeight + formData.weight}%. Maximum allowed: ${100 - otherCriteriaWeight}%`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (criterion) {
        await updateMutation.mutateAsync({
          id: criterion.id,
          ...formData,
        });
      } else {
        await createMutation.mutateAsync({
          track,
          ...formData,
        });
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save criterion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const trackLabel = track === 'IDEA_SPRINT' ? 'IdeaSprint' : 'BuildStorm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-mono font-bold text-white tracking-wider">
              {criterion ? 'EDIT' : 'ADD'} CRITERION
            </h2>
            <p className="text-xs font-mono text-gray-500 mt-1">{trackLabel} Track</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-400 rounded-md hover:bg-white/[0.05] transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Criterion ID */}
          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-2">
              Criterion ID
            </label>
            <input
              type="text"
              value={formData.criterionId}
              onChange={(e) => handleChange('criterionId', e.target.value)}
              placeholder="e.g., innovation, technical_excellence"
              className="w-full px-3 py-2 text-sm font-mono bg-transparent border border-white/[0.06] rounded-md text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/30"
              disabled={!!criterion} // Don't allow editing ID of existing criterion
            />
            {errors.criterionId && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {errors.criterionId}
              </p>
            )}
            {!criterion && (
              <p className="text-xs text-gray-600 mt-1">
                Use lowercase letters and underscores only. Cannot be changed after creation.
              </p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-2">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Innovation & Creativity"
              className="w-full px-3 py-2 text-sm font-mono bg-transparent border border-white/[0.06] rounded-md text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/30"
            />
            {errors.name && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Detailed description of what this criterion evaluates..."
              rows={3}
              className="w-full px-3 py-2 text-sm font-mono bg-transparent border border-white/[0.06] rounded-md text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/30 resize-none"
            />
            {errors.description && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {errors.description}
              </p>
            )}
          </div>

          {/* Weight and Max Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-2">
                Weight (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.weight}
                onChange={(e) => handleChange('weight', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono bg-transparent border border-white/[0.06] rounded-md text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/30"
              />
              {errors.weight && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.weight}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-2">
                Max Points
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.maxPoints}
                onChange={(e) => handleChange('maxPoints', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono bg-transparent border border-white/[0.06] rounded-md text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/30"
              />
              {errors.maxPoints && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.maxPoints}
                </p>
              )}
            </div>
          </div>

          {/* Order and Active Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-2">
                Display Order
              </label>
              <input
                type="number"
                min="1"
                value={formData.order}
                onChange={(e) => handleChange('order', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm font-mono bg-transparent border border-white/[0.06] rounded-md text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/30"
              />
              {errors.order && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.order}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-2">
                Status
              </label>
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleChange('isActive', e.target.checked)}
                    className="rounded border-gray-600 bg-transparent text-orange-500 focus:ring-orange-500/50"
                  />
                  <span className="text-sm text-gray-300">Active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-mono text-gray-400 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-mono font-bold tracking-wider rounded-md transition-all disabled:opacity-50 ${
                track === 'IDEA_SPRINT'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20'
                  : 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20'
              }`}
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
