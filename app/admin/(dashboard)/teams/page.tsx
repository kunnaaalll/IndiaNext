// Admin Teams Management Page
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { TeamsTable } from "@/components/admin/teams/TeamsTable";
import { TeamsFilters } from "@/components/admin/teams/TeamsFilters";
import { BulkActions } from "@/components/admin/teams/BulkActions";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function TeamsManagementPage() {
  const [filters, setFilters] = useState({
    status: "all",
    track: "all",
    college: "",
    search: "",
    dateRange: { from: undefined, to: undefined },
    sortBy: "createdAt" as "createdAt" | "name" | "status" | "college",
    sortOrder: "desc" as "asc" | "desc",
    page: 1,
    pageSize: 50,
  });

  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const { data, isLoading, refetch } = trpc.admin.getTeams.useQuery(filters);
  const exportMutation = trpc.admin.exportTeams.useMutation();

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({
        status: filters.status,
        track: filters.track,
        format: "csv",
      });

      // Convert to CSV
      const csv = convertToCSV(result.teams);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `teams-export-${new Date().toISOString()}.csv`;
      a.click();

      toast.success(`Exported ${result.count} teams`);
    } catch (_error) {
      toast.error("Failed to export teams");
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-mono font-bold text-white tracking-wider">TEAMS_MANAGEMENT</h1>
          <p className="text-[11px] font-mono text-gray-500 mt-1">
            {data?.totalCount || 0} total teams registered
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono font-bold tracking-wider text-gray-400 bg-white/[0.03] border border-white/[0.06] rounded-md hover:text-orange-400 hover:border-orange-500/20 transition-all disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            REFRESH
          </button>
          <button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono font-bold tracking-wider text-gray-400 bg-white/[0.03] border border-white/[0.06] rounded-md hover:text-orange-400 hover:border-orange-500/20 transition-all disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            EXPORT
          </button>
        </div>
      </div>

      <TeamsFilters filters={filters} onChange={(newFilters) => {
        const merged = { ...filters, ...newFilters };
        setFilters({
          ...merged,
          sortBy: merged.sortBy as "createdAt" | "name" | "status" | "college",
          sortOrder: merged.sortOrder as "asc" | "desc",
        });
      }} />

      {selectedTeams.length > 0 && (
        <BulkActions
          selectedTeams={selectedTeams}
          onComplete={() => {
            setSelectedTeams([]);
            refetch();
          }}
        />
      )}

      <TeamsTable
        teams={data?.teams || []}
        totalCount={data?.totalCount || 0}
        currentPage={filters.page}
        pageSize={filters.pageSize}
        isLoading={isLoading}
        selectedTeams={selectedTeams}
        onSelectionChange={setSelectedTeams}
        onPageChange={(page: number) => setFilters({ ...filters, page })}
        onSort={(field: string, order: string) => {
          if (field === "createdAt" || field === "name" || field === "status" || field === "college") {
            if (order === "asc" || order === "desc") {
              setFilters({ ...filters, sortBy: field, sortOrder: order });
            }
          }
        }}
      />
    </div>
  );
}

interface ExportTeam {
  name: string;
  track: string;
  status: string;
  college?: string | null;
  members: { role: string; user: { name?: string | null; email: string; phone?: string | null } }[];
  createdAt: string | Date;
  reviewedAt?: string | Date | null;
  reviewNotes?: string | null;
}

function convertToCSV(teams: ExportTeam[]): string {
  const headers = [
    "Team Name",
    "Track",
    "Status",
    "College",
    "Leader Name",
    "Leader Email",
    "Leader Phone",
    "Members Count",
    "Registered At",
    "Reviewed At",
    "Review Notes",
  ];

  const rows = teams.map((team) => {
    const leader = team.members.find((m: { role: string }) => m.role === "LEADER");
    return [
      team.name,
      team.track,
      team.status,
      team.college || "",
      leader?.user.name || "",
      leader?.user.email || "",
      leader?.user.phone || "",
      team.members.length,
      new Date(team.createdAt).toLocaleString(),
      team.reviewedAt ? new Date(team.reviewedAt).toLocaleString() : "",
      team.reviewNotes || "",
    ];
  });

  return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}
