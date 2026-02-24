"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/judge/button";

export function JudgeHeader({ user }: { user: any }) {
    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <h2 className="text-sm font-medium text-gray-500">
                Evaluation Period: <span className="text-gray-900 font-bold">Live</span>
            </h2>

            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5 text-gray-500" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </Button>
            </div>
        </header>
    );
}
