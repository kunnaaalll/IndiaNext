"use client";

import { trpc } from "@/lib/trpc-client";
import { CheckCircle, Clock, Trophy, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function JudgeDashboard() {
    const { data: stats, isLoading } = trpc.judge.getDashboardStats.useQuery();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                    <p className="text-xs font-mono text-orange-500 animate-pulse">LOADING_DATA...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-mono font-black tracking-tight text-white uppercase mb-2">
                    Judge Dashboard
                </h1>
                <p className="text-xs font-mono text-gray-500 tracking-widest uppercase">
                    Evaluation Panel // Status: Active
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard
                    title="Total Assigned"
                    value={stats?.totalAssigned || 0}
                    icon={<Trophy className="w-5 h-5 text-purple-400" />}
                    color="border-purple-500/20 bg-purple-500/5 text-purple-400"
                />
                <StatsCard
                    title="Evaluated"
                    value={stats?.evaluated || 0}
                    icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
                    color="border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                />
                <StatsCard
                    title="Pending"
                    value={stats?.pending || 0}
                    icon={<Clock className="w-5 h-5 text-orange-400" />}
                    color="border-orange-500/20 bg-orange-500/5 text-orange-400"
                />
            </div>

            <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-lg p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ArrowRight size={100} />
                </div>

                <div className="relative z-10">
                    <h2 className="text-lg font-mono font-bold text-white mb-2 uppercase tracking-wider">
                        Ready to Evaluate?
                    </h2>
                    <p className="text-sm text-gray-400 mb-6 max-w-md">
                        Begin reviewing your assigned teams. Ensure fair and consistent scoring based on the provided rubric.
                    </p>

                    <Link
                        href="/judge/teams"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-black font-mono text-xs font-bold tracking-widest uppercase rounded transition-colors"
                    >
                        Start Judging <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

function StatsCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <div className={`p-6 border rounded-lg ${color} relative overflow-hidden group transition-all hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase opacity-70">
                    {title}
                </span>
                <div className="p-2 rounded-md bg-white/5 backdrop-blur-sm">
                    {icon}
                </div>
            </div>
            <h3 className="text-4xl font-mono font-black tracking-tighter">
                {String(value).padStart(2, '0')}
            </h3>

            {/* Decorative elements */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20" />
            <div className="absolute -bottom-4 -right-4 text-[4rem] font-black opacity-5 select-none pointer-events-none">
                {String(value).padStart(2, '0')}
            </div>
        </div>
    );
}
