import { z } from "zod";
import { router, judgeProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const judgeRouter = router({
    // ═══════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════

    getDashboardStats: judgeProcedure.query(async ({ ctx }) => {
        const [
            totalAssigned,
            evaluated,
            pending
        ] = await Promise.all([
            ctx.prisma.team.count({
                where: {
                    status: "APPROVED", // Only approved teams are judged
                    deletedAt: null,
                }
            }),
            ctx.prisma.team.count({
                where: {
                    status: "APPROVED",
                    deletedAt: null,
                    submission: {
                        judgeScore: { not: null }
                    }
                }
            }),
            ctx.prisma.team.count({
                where: {
                    status: "APPROVED",
                    deletedAt: null,
                    submission: {
                        judgeScore: null
                    }
                }
            })
        ]);

        return {
            totalAssigned,
            evaluated,
            pending
        };
    }),

    // ═══════════════════════════════════════════════════════════
    // TEAMS LIST
    // ═══════════════════════════════════════════════════════════

    getTeamsToJudge: judgeProcedure
        .input(
            z.object({
                track: z.enum(["IDEA_SPRINT", "BUILD_STORM", "ALL"]).default("ALL"),
                status: z.enum(["ALL", "EVALUATED", "PENDING"]).default("ALL"),
                search: z.string().optional(),
                page: z.number().default(1),
                pageSize: z.number().default(20),
            })
        )
        .query(async ({ ctx, input }) => {
            const where: Record<string, any> = {
                status: "APPROVED",
                deletedAt: null,
            };

            // Filter by track
            if (input.track !== "ALL") {
                where.track = input.track;
            }

            // Filter by evaluation status
            if (input.status === "EVALUATED") {
                where.submission = { judgeScore: { not: null } };
            } else if (input.status === "PENDING") {
                where.submission = { judgeScore: null };
            }

            // Search
            if (input.search) {
                where.OR = [
                    { name: { contains: input.search, mode: "insensitive" } },
                    { id: { contains: input.search, mode: "insensitive" } },
                ];
            }

            const [teams, totalCount] = await Promise.all([
                ctx.prisma.team.findMany({
                    where,
                    include: {
                        submission: {
                            select: {
                                id: true,
                                ideaTitle: true,
                                problemStatement: true,
                                judgeScore: true,
                                submittedAt: true,
                            }
                        },
                        members: {
                            select: {
                                id: true,
                                role: true,
                                user: {
                                    select: { name: true }
                                }
                            }
                        }
                    },
                    orderBy: [
                        { submission: { judgeScore: 'asc' } }, // Pending first (nulls first usually)
                        { createdAt: 'asc' }
                    ],
                    skip: (input.page - 1) * input.pageSize,
                    take: input.pageSize,
                }),
                ctx.prisma.team.count({ where }),
            ]);

            return {
                teams,
                totalCount,
                totalPages: Math.ceil(totalCount / input.pageSize),
            };
        }),

    // ═══════════════════════════════════════════════════════════
    // EVALUATION
    // ═══════════════════════════════════════════════════════════

    getTeamForEvaluation: judgeProcedure
        .input(z.object({ teamId: z.string() }))
        .query(async ({ ctx, input }) => {
            const team = await ctx.prisma.team.findUnique({
                where: { id: input.teamId },
                include: {
                    submission: {
                        include: {
                            files: true
                        }
                    },
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    college: true,
                                    year: true,
                                    degree: true,
                                }
                            }
                        }
                    }
                }
            });

            if (!team) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
            }

            if (team.status !== "APPROVED") {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Team is not approved for judging" });
            }

            return team;
        }),

    submitEvaluation: judgeProcedure
        .input(
            z.object({
                teamId: z.string(),
                score: z.number().min(0).max(100),
                comments: z.string().optional(),
                // Breakdown (optional, can be stored in metadata or comments)
                criteria: z.record(z.number()).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const team = await ctx.prisma.team.findUnique({
                where: { id: input.teamId },
                include: { submission: true }
            });

            if (!team || !team.submission) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
            }

            // Update submission with score
            await ctx.prisma.submission.update({
                where: { id: team.submission.id },
                data: {
                    judgeScore: input.score,
                    judgeComments: input.comments,
                }
            });

            // Log activity
            await ctx.prisma.activityLog.create({
                data: {
                    userId: ctx.isUser ? ctx.user.id : null,
                    action: "team.judged",
                    entity: "Team",
                    entityId: input.teamId,
                    metadata: {
                        score: input.score,
                        comments: input.comments,
                        criteria: input.criteria,
                        adminId: !ctx.isUser ? ctx.user.id : undefined,
                        judgeName: ctx.user.name
                    }
                }
            });

            return { success: true };
        }),
});
