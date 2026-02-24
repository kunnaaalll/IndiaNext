"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    LogOut,
    Trophy,
    Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

export function JudgeSidebar({ user }: { user: any }) {
    const pathname = usePathname();

    const links = [
        { href: "/judge", label: "Dashboard", icon: LayoutDashboard },
        { href: "/judge/teams", label: "Evaluate Teams", icon: Users },
    ];

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="h-16 flex items-center px-6 border-b border-gray-100">
                <span className="text-xl font-bold text-indigo-600">IndiaNext</span>
                <span className="ml-2 text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                    JUDGE
                </span>
            </div>

            <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                        >
                            <Icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-gray-400")} />
                            {link.label}
                        </Link>
                    );
                })}
            </div>

            <div className="p-4 border-t border-gray-100">
                <div className="flex items-center gap-3 px-3 py-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                        {user.name?.charAt(0) || "J"}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                </div>
                <button
                    onClick={() => window.location.href = "/api/auth/signout"}
                    className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
