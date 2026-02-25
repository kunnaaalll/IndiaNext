"use client";

import { useState, use } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/judge/button";
import { Textarea } from "@/components/judge/textarea";
import { Input } from "@/components/judge/input";
import { Label } from "@/components/judge/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Github, Globe, Terminal } from "lucide-react";
import Link from "next/link";

export default function EvaluateTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
    const router = useRouter();
    const { teamId } = use(params);
    const utils = trpc.useUtils();
    const { data: team, isLoading } = trpc.judge.getTeamForEvaluation.useQuery({ teamId });
    const submitEvaluation = trpc.judge.submitEvaluation.useMutation({
        onSuccess: () => {
            utils.judge.getTeamsToJudge.invalidate();
            utils.judge.getTeamForEvaluation.invalidate({ teamId });
        }
    });

    const handleSubmit = async (scoreVal: string, commentsVal: string) => {
        const numScore = parseFloat(scoreVal);
        if (isNaN(numScore) || numScore < 0 || numScore > 100) {
            toast.error("Please enter a valid score between 0 and 100");
            return;
        }

        try {
            await submitEvaluation.mutateAsync({
                teamId,
                score: numScore,
                comments: commentsVal,
            });
            toast.success("Evaluation submitted successfully");
            router.push("/judge/teams");
        } catch (_error) {
            toast.error("Failed to submit evaluation");
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

    if (!team) return <div className="p-12 text-center text-red-500 font-mono">ERROR: TEAM_NOT_FOUND</div>;

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
                                {submission.files.map((file) => (
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
                            key={team.submission?.id || 'loading'}
                            initialScore={team.submission?.judgeScore?.toString() ?? ""}
                            initialComments={team.submission?.judgeComments ?? ""}
                            onSubmit={handleSubmit}
                            isSubmitting={submitEvaluation.isPending}
                        />
                    </div>

                    <div className="bg-[#0A0A0A] p-6 rounded border border-white/10">
                        <h2 className="text-sm font-mono font-bold text-gray-500 uppercase tracking-widest mb-4">Team Members</h2>
                        <div className="space-y-3">
                            {team.members.map((member) => (
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
    initialScore,
    initialComments,
    onSubmit,
    isSubmitting
}: {
    initialScore: string,
    initialComments: string,
    onSubmit: (score: string, comments: string) => void,
    isSubmitting: boolean
}) {
    const [score, setScore] = useState(initialScore);
    const [comments, setComments] = useState(initialComments);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(score, comments);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="score" className="text-xs font-mono text-gray-400 uppercase tracking-wider">Total Score (0-100)</Label>
                <Input
                    id="score"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="00.0"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    required
                    className="bg-black border-white/10 text-white text-lg font-mono font-bold focus:border-orange-500/50 focus:ring-orange-500/20"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="comments" className="text-xs font-mono text-gray-400 uppercase tracking-wider">Feedback / Comments</Label>
                <Textarea
                    id="comments"
                    placeholder="ENTER_FEEDBACK..."
                    rows={6}
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
