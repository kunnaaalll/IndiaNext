"use client";

import { useState, useCallback } from "react";
import { JudgeSidebar } from "./JudgeSidebar";
import { JudgeHeader } from "./JudgeHeader";

interface JudgeUser {
    id: string;
    name: string;
    email: string;
    role: string;
}

export function JudgeShell({
    user,
    children,
}: {
    user: JudgeUser;
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    return (
        <>
            <JudgeSidebar user={user} isOpen={sidebarOpen} onClose={closeSidebar} />
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                <JudgeHeader user={user} onMenuToggle={toggleSidebar} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
            </div>
        </>
    );
}
