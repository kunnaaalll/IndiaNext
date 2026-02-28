// Admin Dashboard Home Page
"use client";

import { trpc } from "@/lib/trpc-client";
import { StatsCards } from "@/components/admin/dashboard/StatsCards";
import { RegistrationChart } from "@/components/admin/dashboard/RegistrationChart";
import { RecentActivity } from "@/components/admin/dashboard/RecentActivity";
import { TopColleges } from "@/components/admin/dashboard/TopColleges";
import { TrackDistribution } from "@/components/admin/dashboard/TrackDistribution";
import { Loader2 } from "lucide-react";
import { SkeletonCard } from "@/components/animations";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } =
    trpc.admin.getStats.useQuery();
  const { data: analytics, isLoading: analyticsLoading } =
    trpc.admin.getAnalytics.useQuery();

  if (statsLoading || analyticsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats && <StatsCards stats={stats} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {analytics && (
          <RegistrationChart
            data={analytics.registrationTrends.map((item: { date: string | Date; count: number }) => ({
              date: String(item.date),
              count: item.count,
            }))}
          />
        )}
        {analytics && <TrackDistribution data={analytics.trackComparison} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {analytics && <TopColleges data={analytics.collegeDistribution} />}
        <RecentActivity />
      </div>
    </div>
  );
}
