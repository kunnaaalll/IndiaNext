"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/judge/button";
import { Input } from "@/components/judge/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/judge/select";
import Link from "next/link";
import { Badge } from "@/components/judge/badge";
import { Search, Filter } from "lucide-react";

export default function JudgeTeamsPage() {
    const [filters, setFilters] = useState({
        track: "ALL" as "ALL" | "IDEA_SPRINT" | "BUILD_STORM",
        status: "ALL" as "ALL" | "EVALUATED" | "PENDING",
        search: "",
        page: 1,
    });

    const { data, isLoading } = trpc.judge.getTeamsToJudge.useQuery(filters);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Teams Evaluation</h1>
                    <p className="text-gray-500 text-sm">Select a team to evaluate</p>
                </div>

                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search teams..."
                            className="pl-9 w-[250px]"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                        />
                    </div>
                    <Select
                        value={filters.track}
                        onValueChange={(val: any) => setFilters(prev => ({ ...prev, track: val, page: 1 }))}
                    >
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Track" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Tracks</SelectItem>
                            <SelectItem value="IDEA_SPRINT">IdeaSprint</SelectItem>
                            <SelectItem value="BUILD_STORM">BuildStorm</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={filters.status}
                        onValueChange={(val: any) => setFilters(prev => ({ ...prev, status: val, page: 1 }))}
                    >
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="EVALUATED">Evaluated</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">Loading teams...</div>
            ) : (
                <div className="bg-white border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Team Name</th>
                                <th className="px-6 py-4">Track</th>
                                <th className="px-6 py-4">Idea Title</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Score</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data?.teams.map((team) => (
                                <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{team.name}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={team.track === "IDEA_SPRINT" ? "default" : "secondary"}>
                                            {team.track === "IDEA_SPRINT" ? "IdeaSprint" : "BuildStorm"}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate">
                                        {team.submission?.ideaTitle || "Untitled"}
                                    </td>
                                    <td className="px-6 py-4">
                                        {team.submission?.judgeScore !== null ? (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Evaluated</Badge>
                                        ) : (
                                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">Pending</Badge>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-mono font-bold">
                                        {team.submission?.judgeScore ?? "-"} / 100
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/judge/evaluate/${team.id}`}>
                                            <Button size="sm" variant="outline">
                                                {team.submission?.judgeScore !== null ? "Edit Score" : "Evaluate"}
                                            </Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {data?.teams.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No teams found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
