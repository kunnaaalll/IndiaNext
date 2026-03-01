"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function CriteriaPage() {
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data: criteria, isLoading, refetch } = trpc.criteria.getAll.useQuery();

    const createMutation = trpc.criteria.create.useMutation({
        onSuccess: () => {
            toast.success("Criteria created successfully");
            setIsCreating(false);
            refetch();
        },
        onError: (err) => toast.error(err.message),
    });

    const updateMutation = trpc.criteria.update.useMutation({
        onSuccess: () => {
            toast.success("Criteria updated successfully");
            setEditingId(null);
            refetch();
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteMutation = trpc.criteria.delete.useMutation({
        onSuccess: () => {
            toast.success("Criteria deleted successfully");
            refetch();
        },
        onError: (err) => toast.error(err.message),
    });

    const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        createMutation.mutate({
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            weight: parseFloat(formData.get("weight") as string),
            maxScore: parseFloat(formData.get("maxScore") as string),
            track: formData.get("track") as "IDEA_SPRINT" | "BUILD_STORM",
        });
    };

    const handleUpdate = (id: string, e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        updateMutation.mutate({
            id,
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            weight: parseFloat(formData.get("weight") as string),
            maxScore: parseFloat(formData.get("maxScore") as string),
            isActive: formData.get("isActive") === "on",
        });
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading criteria...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Judging Criteria</h1>
                    <p className="text-gray-400 text-sm mt-1">Manage evaluation metrics for each track</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Criteria
                </button>
            </div>

            {/* Create Form */}
            {isCreating && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wider">New Criteria</h3>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Name</label>
                            <input
                                name="name"
                                required
                                placeholder="e.g. Innovation"
                                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                            />
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-xs text-gray-500 mb-1">Description</label>
                            <input
                                name="description"
                                placeholder="Brief description for judges..."
                                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Weight (Multiplier)</label>
                            <input
                                name="weight"
                                type="number"
                                step="0.1"
                                defaultValue="1.0"
                                required
                                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Max Score</label>
                            <input
                                name="maxScore"
                                type="number"
                                defaultValue="10"
                                required
                                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Track</label>
                            <select
                                name="track"
                                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                            >
                                <option value="IDEA_SPRINT">Idea Sprint</option>
                                <option value="BUILD_STORM">Build Storm</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 md:col-span-6 justify-end mt-2">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-medium transition-colors"
                            >
                                {createMutation.isPending ? "Saving..." : "Create Criteria"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Criteria List */}
            <div className="grid gap-6">
                {["IDEA_SPRINT", "BUILD_STORM"].map((track) => {
                    const trackCriteria = criteria?.filter((c) => c.track === track);

                    return (
                        <div key={track} className="bg-[#0A0A0A] border border-white/5 rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                <h2 className="text-sm font-bold text-gray-300 tracking-wider uppercase">
                                    {track.replace("_", " ")}
                                </h2>
                                <span className="text-xs text-gray-600 font-mono">
                                    {trackCriteria?.length || 0} CRITERIA
                                </span>
                            </div>

                            <div className="divide-y divide-white/5">
                                {trackCriteria?.length === 0 ? (
                                    <div className="p-8 text-center text-gray-600 text-sm italic">
                                        No criteria defined for this track yet.
                                    </div>
                                ) : (
                                    trackCriteria?.map((item) => (
                                        <div key={item.id} className="p-4 hover:bg-white/[0.01] transition-colors group">
                                            {editingId === item.id ? (
                                                <form onSubmit={(e) => handleUpdate(item.id, e)} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                                    <div className="md:col-span-3">
                                                        <input
                                                            name="name"
                                                            defaultValue={item.name}
                                                            className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-orange-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-3">
                                                        <input
                                                            name="description"
                                                            defaultValue={item.description || ""}
                                                            placeholder="Description..."
                                                            className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-orange-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <input
                                                            name="weight"
                                                            type="number"
                                                            step="0.1"
                                                            defaultValue={item.weight}
                                                            className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-orange-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <input
                                                            name="maxScore"
                                                            type="number"
                                                            defaultValue={item.maxScore}
                                                            className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-orange-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2 flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            name="isActive"
                                                            defaultChecked={item.isActive}
                                                            className="w-4 h-4 rounded border-gray-600 bg-transparent text-orange-500 focus:ring-orange-500"
                                                        />
                                                        <span className="text-xs text-gray-400">Active</span>
                                                    </div>
                                                    <div className="md:col-span-2 flex justify-end gap-2">
                                                        <button
                                                            type="submit"
                                                            className="p-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded transition-colors"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingId(null)}
                                                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-green-500' : 'bg-gray-700'}`} />
                                                        <div>
                                                            <div className="text-sm font-medium text-white">{item.name}</div>
                                                            {item.description && (
                                                                <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                                            )}
                                                            <div className="text-xs text-gray-500 font-mono mt-0.5">
                                                                Weight: {item.weight}x • Max: {item.maxScore}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setEditingId(item.id)}
                                                            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm("Are you sure you want to delete this criteria?")) {
                                                                    deleteMutation.mutate({ id: item.id });
                                                                }
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}