/**
 * Status or Scoring Component
 * 
 * Shows different UI based on admin role:
 * - Judges: Criteria-based scoring rubric (only for APPROVED teams)
 * - Others: Status management interface
 */

"use client";

import { useState, useEffect } from "react";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { ScoringRubric } from "./ScoringRubric";

interface StatusOrScoringProps {
  userRole: string;
  teamId: string;
  teamStatus: string;
  teamTrack: "IDEA_SPRINT" | "BUILD_STORM";
  currentScore: number | null;
  currentComments: string | null;
  reviewNotes: string | null;
  onStatusUpdate: (status: string, notes?: string) => Promise<void>;
  onScoreUpdate: (score: number, comments: string) => Promise<void>;
}

const statusActions = [
  {
    status: "APPROVED",
    label: "Approve",
    icon: CheckCircle,
    color: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25",
  },
  {
    status: "REJECTED",
    label: "Reject",
    icon: XCircle,
    color: "bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25",
  },
  {
    status: "UNDER_REVIEW",
    label: "Under Review",
    icon: Eye,
    color: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/25",
  },
  {
    status: "WAITLISTED",
    label: "Waitlist",
    icon: AlertTriangle,
    color: "bg-orange-500/15 text-orange-400 border border-orange-500/20 hover:bg-orange-500/25",
  },
  {
    status: "PENDING",
    label: "Reset to Pending",
    icon: Clock,
    color: "bg-white/[0.05] text-gray-300 border border-white/[0.08] hover:bg-white/[0.08]",
  },
];

export function StatusOrScoring({
  userRole,
  teamId,
  teamStatus,
  teamTrack,
  currentScore,
  currentComments,
  reviewNotes,
  onStatusUpdate,
  onScoreUpdate,
}: StatusOrScoringProps) {
  const [statusNote, setStatusNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [existingScores, setExistingScores] = useState<any[]>([]);
  const [multiJudge, setMultiJudge] = useState<any>(null);
  const [isLoadingRubric, setIsLoadingRubric] = useState(false);

  // Load rubric data for judges
  useEffect(() => {
    if (userRole === "JUDGE" && teamStatus === "APPROVED") {
      loadRubricData();
    }
  }, [userRole, teamStatus, teamId]);

  const loadRubricData = async () => {
    setIsLoadingRubric(true);
    try {
      const res = await fetch(`/api/admin/teams/score-rubric?teamId=${teamId}`);
      const data = await res.json();
      
      if (data.success) {
        setCriteria(data.data.criteria);
        setExistingScores(data.data.scores);
        setMultiJudge(data.data.multiJudge || null);
      }
    } catch (error) {
      console.error("Failed to load rubric data:", error);
    } finally {
      setIsLoadingRubric(false);
    }
  };

  // Judges see scoring rubric
  if (userRole === "JUDGE") {
    // Judges can only score APPROVED teams
    if (teamStatus !== "APPROVED") {
      return (
        <div className="bg-[#0A0A0A] rounded-lg border border-yellow-500/20 p-5">
          <div className="flex items-center gap-3 text-yellow-400">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <h3 className="text-sm font-mono font-bold">TEAM NOT APPROVED</h3>
              <p className="text-xs text-gray-400 mt-1">
                You can only score teams with APPROVED status. Current status: {teamStatus}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (isLoadingRubric) {
      return (
        <div className="bg-[#0A0A0A] rounded-lg border border-amber-500/20 p-5">
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <div className="animate-spin h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full" />
            <span className="text-xs font-mono">Loading rubric...</span>
          </div>
        </div>
      );
    }

    const handleRubricScoreUpdate = async (scores: any[]) => {
      const res = await fetch("/api/admin/teams/score-rubric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, scores }),
      });
      
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to submit scores");
      }
      
      // Reload rubric data to show updated scores
      await loadRubricData();
    };

    return (
      <ScoringRubric
        teamId={teamId}
        track={teamTrack}
        criteria={criteria}
        existingScores={existingScores}
        multiJudge={multiJudge}
        onScoreUpdate={handleRubricScoreUpdate}
      />
    );
  }

  // Admins/Organizers see status management
  return (
    <div className="bg-[#0A0A0A] rounded-lg border border-white/[0.06] p-5">
      <h3 className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-[0.3em] mb-4">
        UPDATE_STATUS
      </h3>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
        <div className="w-full sm:flex-1 sm:min-w-[200px]">
          <input
            type="text"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            placeholder="Review notes (optional)..."
            className="w-full px-3 py-2 text-xs font-mono bg-white/[0.02] border border-white/[0.06] rounded-md text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/30"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {statusActions.map((action) => (
            <button
              key={action.status}
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  await onStatusUpdate(action.status, statusNote || undefined);
                  setStatusNote("");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting || teamStatus === action.status}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-mono font-bold tracking-wider rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed ${action.color}`}
            >
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
      {reviewNotes && (
        <div className="mt-3 text-xs font-mono text-gray-400 bg-white/[0.02] border border-white/[0.04] rounded-md p-3">
          <span className="text-gray-500 font-bold">LAST_NOTE: </span>
          {reviewNotes}
        </div>
      )}
    </div>
  );
}
