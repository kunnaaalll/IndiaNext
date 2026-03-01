"use client";

import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/judge/button";
import { Textarea } from "@/components/judge/textarea";
import { Input } from "@/components/judge/input";
import { Label } from "@/components/judge/label";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Github, Globe, Terminal, Info } from "lucide-react";
import Link from "next/link";

export default function EvaluateTeamPage() {
    const router = useRouter();
    const params = useParams();
    const teamId = params.teamId as string;
    const utils = trpc.useUtils();

    // Ensure teamId is a string and not empty before enabling the query
    const isTeamIdValid = typeof teamId === 'string' && teamId.length > 0;

    const { data, isLoading } = trpc.judge.getTeamForEvaluation.useQuery(
        { teamId },
        { enabled: isTeamIdValid }
    );
    const submitEvaluation = trpc.judge.submitEvaluation.useMutation({
        onSuccess: async () => {
            await Promise.all([
                utils.judge.getTeamsToJudge.invalidate(),
                utils.judge.getTeamForEvaluation.invalidate({ teamId })
            ]);
            toast.success("Evaluation submitted successfully");
            router.push("/judge/teams");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to submit evaluation");
        }
    });

    const handleSubmit = async (criteriaScores: Record<string, number>, commentsVal: string) => {
        try {
            await submitEvaluation.mutateAsync({
                teamId,
                criteriaScores,
                comments: commentsVal,
            });
        } catch (_error) {
            // Error handled in onError
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                <p className="text-xs font-mono text-orange-500 animate-pulse">LOADING_TEAM_DATA...</p>
            </div>
        </div>
    );

    if (!data) return <div className="p-12 text-center text-red-500 font-mono">ERROR: TEAM_NOT_FOUND</div>;

    const { team: rawTeam, criteria } = data;
    const team = rawTeam as any; // Bypass type inference issue
    const submission = team.submission;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                <Link href="/judge/teams">
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/5">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-mono font-black text-white uppercase tracking-tight">{team.name}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider border ${team.track === "IDEA_SPRINT"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                            }`}>
                            {team.track === "IDEA_SPRINT" ? "IDEA_SPRINT" : "BUILD_STORM"}
                        </span>
                        <span className="text-gray-500 text-xs font-mono tracking-wider">
                            {"//"} {team.members.length} MEMBERS
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Submission Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#0A0A0A] p-6 rounded border border-white/10 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Terminal size={120} />
                        </div>

                        <h2 className="text-sm font-mono font-bold text-gray-500 uppercase tracking-widest border-b border-white/10 pb-4">
                            Submission Details
                        </h2>

                        {submission ? (
                            <>
                                {team.track === "IDEA_SPRINT" ? (
                                    <div className="space-y-6">
                                        <DetailBlock label="Idea Title" value={submission.ideaTitle} />
                                        <DetailBlock label="Problem Statement" value={submission.problemStatement} />
                                        <DetailBlock label="Proposed Solution" value={submission.proposedSolution} />
                                        <DetailBlock label="Target Users" value={submission.targetUsers} />
                                        <DetailBlock label="Tech Stack" value={submission.techStack} />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <DetailBlock label="Problem Description" value={submission.problemDesc} />
                                        <DetailBlock label="Tech Stack Used" value={submission.techStackUsed} />
                                        <DetailBlock label="Challenges" value={submission.challenges} />
                                        <DetailBlock label="Future Scope" value={submission.futureScope} />

                                        <div className="flex gap-4 pt-4 border-t border-white/10">
                                            {submission.githubLink && (
                                                <a href={submission.githubLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors">
                                                    <Github className="h-4 w-4" /> GITHUB_REPO
                                                </a>
                                            )}
                                            {submission.demoLink && (
                                                <a href={submission.demoLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-mono text-orange-400 hover:text-orange-300 transition-colors">
                                                    <Globe className="h-4 w-4" /> LIVE_DEMO
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-gray-500 italic font-mono text-sm">NO_SUBMISSION_DATA_AVAILABLE</p>
                        )}
                    </div>

                    {/* Files */}
                    {submission?.files && submission.files.length > 0 && (
                        <div className="bg-[#0A0A0A] p-6 rounded border border-white/10">
                            <h2 className="text-sm font-mono font-bold text-gray-500 uppercase tracking-widest border-b border-white/10 pb-4 mb-4">
                                Attached Files
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {submission.files.map((file: any) => (
                                    <a
                                        key={file.id}
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 border border-white/10 rounded hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="font-mono text-xs font-bold text-gray-300 truncate group-hover:text-white transition-colors">{file.fileName}</p>
                                            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">{file.category}</p>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-gray-600 ml-auto group-hover:text-cyan-400 transition-colors" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Evaluation Form */}
                <div className="space-y-6">
                    <div className="bg-[#0A0A0A] p-6 rounded border border-white/10 sticky top-6">
                        <h2 className="text-sm font-mono font-bold text-gray-500 uppercase tracking-widest border-b border-white/10 pb-4 mb-6">
                            Evaluation Protocol
                        </h2>
                        <EvaluationForm
                            key={`${team.submission?.id || 'loading'}-${team.judgeScores?.length || 0}`}
                            criteria={criteria || []}
                            existingScores={team.judgeScores || []}
                            initialComments={team.submission?.judgeComments ?? ""}
                            onSubmit={handleSubmit}
                            isSubmitting={submitEvaluation.isPending}
                        />
                    </div>

                    <div className="bg-[#0A0A0A] p-6 rounded border border-white/10">
                        <h2 className="text-sm font-mono font-bold text-gray-500 uppercase tracking-widest mb-4">Team Members</h2>
                        <div className="space-y-3">
                            {team.members.map((member: any) => (
                                <div key={member.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors">
                                    <div className="h-8 w-8 rounded bg-white/10 flex items-center justify-center text-xs font-mono font-bold text-gray-400">
                                        {member.user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-mono font-bold text-gray-300">{member.user.name}</p>
                                        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">{member.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EvaluationForm({
    criteria,
    existingScores,
    initialComments,
    onSubmit,
    isSubmitting
}: {
    criteria: any[],
    existingScores: any[],
    initialComments: string,
    onSubmit: (criteriaScores: Record<string, number>, comments: string) => void,
    isSubmitting: boolean
}) {
    const [scores, setScores] = useState<Record<string, number>>(() => {
        const initialScores: Record<string, number> = {};
        criteria.forEach(c => {
            const existing = existingScores.find(s => s.criteriaId === c.id);
            if (existing) {
                initialScores[c.id] = existing.score;
            }
        });
        return initialScores;
    });
    const [comments, setComments] = useState(initialComments);

    const handleScoreChange = (criteriaId: string, value: string) => {
        const numVal = parseFloat(value);
        if (!isNaN(numVal)) {
            setScores(prev => ({ ...prev, [criteriaId]: numVal }));
        }
    };

    const calculatedTotal = useMemo(() => {
        let totalWeighted = 0;
        let totalMax = 0;

        criteria.forEach(c => {
            const score = scores[c.id] || 0;
            totalWeighted += score * c.weight;
            totalMax += c.maxScore * c.weight;
        });

        return totalMax > 0 ? (totalWeighted / totalMax) * 100 : 0;
    }, [scores, criteria]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(scores, comments);
    };

    if (criteria.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 text-sm font-mono">
                NO_CRITERIA_DEFINED_FOR_THIS_TRACK
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
                {criteria.map((c) => (
                    <div key={c.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor={`criteria-${c.id}`} className="text-xs font-mono text-gray-300 font-bold uppercase tracking-wider">
                                {c.name}
                            </Label>
                            <span className="text-[10px] font-mono text-gray-500">
                                MAX: {c.maxScore} (x{c.weight})
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="0"
                                max={c.maxScore}
                                step="0.5"
                                value={scores[c.id] || 0}
                                onChange={(e) => handleScoreChange(c.id, e.target.value)}
                                className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                            <Input
                                id={`criteria-${c.id}`}
                                type="number"
                                min="0"
                                max={c.maxScore}
                                step="0.1"
                                value={scores[c.id] || 0}
                                onChange={(e) => handleScoreChange(c.id, e.target.value)}
                                className="w-16 h-8 bg-black border-white/10 text-white text-sm font-mono font-bold text-center focus:border-orange-500/50 focus:ring-orange-500/20"
                            />
                        </div>
                        {c.description && (
                            <p className="text-[10px] text-gray-600">{c.description}</p>
                        )}
                    </div>
                ))}
            </div>

            <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Calculated Score</span>
                    <span className="text-2xl font-mono font-black text-orange-500">{calculatedTotal.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-500"
                        style={{ width: `${calculatedTotal}%` }}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="comments" className="text-xs font-mono text-gray-400 uppercase tracking-wider">Feedback / Comments</Label>
                <Textarea
                    id="comments"
                    placeholder="ENTER_FEEDBACK..."
                    rows={4}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="bg-black border-white/10 text-white font-mono text-sm focus:border-orange-500/50 focus:ring-orange-500/20 resize-none"
                />
            </div>

            <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-black font-mono font-bold uppercase tracking-widest"
                disabled={isSubmitting}
            >
                {isSubmitting ? "SUBMITTING..." : "SUBMIT_EVALUATION"}
            </Button>
        </form>
    );
}

function DetailBlock({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div>
            <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">{label}</h3>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap border-l-2 border-white/10 pl-4">{value}</p>
        </div>
    );
}
