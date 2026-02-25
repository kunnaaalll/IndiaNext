"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import Link from "next/link";
import { Search, Filter, ChevronDown } from "lucide-react";

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
                    <h1 className="text-2xl font-mono font-black tracking-tight text-white uppercase mb-1">
                        Teams Evaluation
                    </h1>
                    <p className="text-xs font-mono text-gray-500 tracking-widest uppercase">
                        Select a team to evaluate // Total: {data?.teams.length || 0}
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            placeholder="SEARCH_TEAMS..."
                            className="pl-9 pr-4 py-2 w-[250px] bg-[#0A0A0A] border border-white/10 rounded text-xs font-mono text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors uppercase tracking-wider"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                        />
                    </div>

                    <div className="relative">
                        <select
                            className="appearance-none pl-4 pr-10 py-2 bg-[#0A0A0A] border border-white/10 rounded text-xs font-mono text-gray-300 focus:outline-none focus:border-orange-500/50 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors"
                            value={filters.track}
                            onChange={(e) => setFilters(prev => ({ ...prev, track: e.target.value as any, page: 1 }))}
                        >
                            <option value="ALL">ALL TRACKS</option>
                            <option value="IDEA_SPRINT">IDEA SPRINT</option>
                            <option value="BUILD_STORM">BUILD STORM</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <select
                            className="appearance-none pl-4 pr-10 py-2 bg-[#0A0A0A] border border-white/10 rounded text-xs font-mono text-gray-300 focus:outline-none focus:border-orange-500/50 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors"
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any, page: 1 }))}
                        >
                            <option value="ALL">ALL STATUS</option>
                            <option value="PENDING">PENDING</option>
                            <option value="EVALUATED">EVALUATED</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64 border border-white/10 rounded bg-[#0A0A0A]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                        <p className="text-[10px] font-mono text-orange-500 animate-pulse tracking-widest">LOADING_TEAMS...</p>
                    </div>
                </div>
            ) : (
                <div className="bg-[#0A0A0A] border border-white/10 rounded overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Team Name</th>
                                    <th className="px-6 py-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Track</th>
                                    <th className="px-6 py-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Idea Title</th>
                                    <th className="px-6 py-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Score</th>
                                    <th className="px-6 py-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data?.teams.map((team) => (
                                    <tr key={team.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm font-bold text-white group-hover:text-orange-400 transition-colors">
                                            {team.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-2 py-1 rounded text-[10px] font-mono font-bold tracking-wider border ${team.track === "IDEA_SPRINT"
                                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                                : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                                }`}>
                                                {team.track === "IDEA_SPRINT" ? "IDEA_SPRINT" : "BUILD_STORM"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-400 max-w-[200px] truncate font-mono">
                                            {team.submission?.ideaTitle || "UNTITLED"}
                                        </td>
                                        <td className="px-6 py-4">
                                            {team.submission?.judgeScore !== null ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                    EVALUATED
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-bold tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                                                    PENDING
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-white">
                                            {team.submission?.judgeScore ?? "-"} <span className="text-gray-600 text-[10px]">/ 100</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/judge/evaluate/${team.id}`}
                                                className="inline-block px-3 py-1.5 border border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 text-[10px] font-mono font-bold text-gray-300 hover:text-orange-400 rounded transition-all uppercase tracking-wider"
                                            >
                                                {team.submission?.judgeScore !== null ? "EDIT_SCORE" : "EVALUATE"}
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {data?.teams.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                                                <Filter className="w-8 h-8 text-gray-600" />
                                                <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">NO_TEAMS_FOUND</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
