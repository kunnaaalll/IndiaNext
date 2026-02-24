import { redirect } from "next/navigation";
import { checkJudgeAuth } from "@/lib/auth";
import { JudgeSidebar } from "@/components/judge/JudgeSidebar";
import { JudgeHeader } from "@/components/judge/JudgeHeader";

export default async function JudgeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await checkJudgeAuth();

    if (!user) {
        redirect("/login?redirect=/judge");
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <JudgeSidebar user={user} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <JudgeHeader user={user} />
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
