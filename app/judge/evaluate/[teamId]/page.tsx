"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/judge/button";
import { Textarea } from "@/components/judge/textarea";
import { Input } from "@/components/judge/input";
import { Label } from "@/components/judge/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Github, Globe } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/judge/badge";

export default function EvaluateTeamPage({ params }: { params: { teamId: string } }) {
    const router = useRouter();
    const { data: team, isLoading } = trpc.judge.getTeamForEvaluation.useQuery({ teamId: params.teamId });
    const submitEvaluation = trpc.judge.submitEvaluation.useMutation();

    const [score, setScore] = useState<string>("");
    const [comments, setComments] = useState("");

    // Initialize form when data loads
    useState(() => {
        if (team?.submission?.judgeScore) {
            setScore(team.submission.judgeScore.toString());
            setComments(team.submission.judgeComments || "");
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const numScore = parseFloat(score);
        if (isNaN(numScore) || numScore < 0 || numScore > 100) {
            toast.error("Please enter a valid score between 0 and 100");
            return;
        }

        try {
            await submitEvaluation.mutateAsync({
                teamId: params.teamId,
                score: numScore,
                comments,
            });
            toast.success("Evaluation submitted successfully");
            router.push("/judge/teams");
        } catch (error) {
            toast.error("Failed to submit evaluation");
        }
    };

    if (isLoading) return <div className="p-12 text-center">Loading team details...</div>;
    if (!team) return <div className="p-12 text-center">Team not found</div>;

    const submission = team.submission;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/judge/teams">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant={team.track === "IDEA_SPRINT" ? "default" : "secondary"}>
                            {team.track === "IDEA_SPRINT" ? "IdeaSprint" : "BuildStorm"}
                        </Badge>
                        <span className="text-gray-500 text-sm">• {team.members.length} Members</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Submission Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
                        <h2 className="text-lg font-bold border-b pb-4">Submission Details</h2>

                        {submission ? (
                            <>
                                {team.track === "IDEA_SPRINT" ? (
                                    <div className="space-y-4">
                                        <DetailBlock label="Idea Title" value={submission.ideaTitle} />
                                        <DetailBlock label="Problem Statement" value={submission.problemStatement} />
                                        <DetailBlock label="Proposed Solution" value={submission.proposedSolution} />
                                        <DetailBlock label="Target Users" value={submission.targetUsers} />
                                        <DetailBlock label="Tech Stack" value={submission.techStack} />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <DetailBlock label="Problem Description" value={submission.problemDesc} />
                                        <DetailBlock label="Tech Stack Used" value={submission.techStackUsed} />
                                        <DetailBlock label="Challenges" value={submission.challenges} />
                                        <DetailBlock label="Future Scope" value={submission.futureScope} />

                                        <div className="flex gap-4 pt-4">
                                            {submission.githubLink && (
                                                <a href={submission.githubLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                                                    <Github className="h-4 w-4" /> GitHub Repo
                                                </a>
                                            )}
                                            {submission.demoLink && (
                                                <a href={submission.demoLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                                                    <Globe className="h-4 w-4" /> Live Demo
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-gray-500 italic">No submission data available.</p>
                        )}
                    </div>

                    {/* Files */}
                    {submission?.files && submission.files.length > 0 && (
                        <div className="bg-white p-6 rounded-xl border shadow-sm">
                            <h2 className="text-lg font-bold border-b pb-4 mb-4">Attached Files</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {submission.files.map((file) => (
                                    <a
                                        key={file.id}
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="font-medium truncate">{file.fileName}</p>
                                            <p className="text-xs text-gray-500">{file.category}</p>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Evaluation Form */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border shadow-sm sticky top-6">
                        <h2 className="text-lg font-bold border-b pb-4 mb-6">Evaluation</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="score">Total Score (0-100)</Label>
                                <Input
                                    id="score"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    placeholder="e.g. 85.5"
                                    value={score}
                                    onChange={(e) => setScore(e.target.value)}
                                    required
                                    className="text-lg font-bold"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="comments">Feedback / Comments</Label>
                                <Textarea
                                    id="comments"
                                    placeholder="Provide constructive feedback for the team..."
                                    rows={6}
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                                disabled={submitEvaluation.isPending}
                            >
                                {submitEvaluation.isPending ? "Submitting..." : "Submit Evaluation"}
                            </Button>
                        </form>
                    </div>

                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Team Members</h2>
                        <div className="space-y-3">
                            {team.members.map((member) => (
                                <div key={member.id} className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                        {member.user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{member.user.name}</p>
                                        <p className="text-xs text-gray-500">{member.role}</p>
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

function DetailBlock({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">{label}</h3>
            <p className="text-gray-900 whitespace-pre-wrap">{value}</p>
        </div>
    );
}
