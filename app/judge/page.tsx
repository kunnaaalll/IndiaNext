"use client";

import { trpc } from "@/lib/trpc-client";
import { Card } from "@/components/judge/card";
import { CheckCircle, Clock, Trophy } from "lucide-react";
import Link from "next/link";

export default function JudgeDashboard() {
    const { data: stats, isLoading } = trpc.judge.getDashboardStats.useQuery();

    if (isLoading) {
        return <div className="p-8">Loading stats...</div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Judge Dashboard</h1>
                <p className="text-gray-600 mt-1">Welcome to the evaluation panel.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard
                    title="Total Assigned"
                    value={stats?.totalAssigned || 0}
                    icon={<Trophy className="w-6 h-6 text-purple-600" />}
                    color="bg-purple-50"
                />
                <StatsCard
                    title="Evaluated"
                    value={stats?.evaluated || 0}
                    icon={<CheckCircle className="w-6 h-6 text-green-600" />}
                    color="bg-green-50"
                />
                <StatsCard
                    title="Pending"
                    value={stats?.pending || 0}
                    icon={<Clock className="w-6 h-6 text-orange-600" />}
                    color="bg-orange-50"
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
                </div>
                <div className="flex gap-4">
                    <Link
                        href="/judge/teams"
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Start Judging
                    </Link>
                </div>
            </div>
        </div>
    );
}

function StatsCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <Card className="p-6 border-none shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${color}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                </div>
            </div>
        </Card>
    );
}
