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
            // Resolve judge ID (Admin -> User)
            let judgeUserId = ctx.user.id;
            if (!ctx.isUser) {
                const user = await ctx.prisma.user.findUnique({
                    where: { email: ctx.user.email }
                });
                judgeUserId = user ? user.id : "non-existent-id";
            }

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
                    },
                    judgeScores: {
                        where: {
                            judgeId: judgeUserId
                        },
                        include: {
                            criteria: true
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

            // Fetch active criteria for this track
            const criteria = await ctx.prisma.judgingCriteria.findMany({
                where: {
                    track: team.track,
                    isActive: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });

            return {
                team,
                criteria
            };
        }),

    submitEvaluation: judgeProcedure
        .input(
            z.object({
                teamId: z.string(),
                criteriaScores: z.record(z.number()), // criteriaId -> score
                comments: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Resolve judge ID (Admin -> User)
            let judgeUserId = ctx.user.id;
            if (!ctx.isUser) {
                const user = await ctx.prisma.user.findUnique({
                    where: { email: ctx.user.email }
                });

                if (user) {
                    judgeUserId = user.id;
                } else {
                    // Create shadow user for this admin to allow judging
                    const newUser = await ctx.prisma.user.create({
                        data: {
                            email: ctx.user.email,
                            name: ctx.user.name,
                            role: "JUDGE",
                            emailVerified: true,
                        }
                    });
                    judgeUserId = newUser.id;
                }
            }

            const team = await ctx.prisma.team.findUnique({
                where: { id: input.teamId },
                include: { submission: true }
            });

            if (!team || !team.submission) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
            }

            // Verify all criteria belong to the correct track
            const criteriaIds = Object.keys(input.criteriaScores);
            const criteria = await ctx.prisma.judgingCriteria.findMany({
                where: {
                    id: { in: criteriaIds },
                    track: team.track
                }
            });

            if (criteria.length !== criteriaIds.length) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid criteria for this track" });
            }

            // Calculate total weighted score
            let totalWeightedScore = 0;
            let totalMaxScore = 0;

            for (const c of criteria) {
                const score = input.criteriaScores[c.id];
                if (score < 0 || score > c.maxScore) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: `Score for ${c.name} must be between 0 and ${c.maxScore}`
                    });
                }
                totalWeightedScore += score * c.weight;
                totalMaxScore += c.maxScore * c.weight;
            }

            // Normalize to 0-100 scale
            const finalScore = totalMaxScore > 0
                ? (totalWeightedScore / totalMaxScore) * 100
                : 0;

            await ctx.prisma.$transaction(async (tx) => {
                // 1. Upsert JudgeScores for each criteria
                for (const criteriaId of criteriaIds) {
                    await tx.judgeScore.upsert({
                        where: {
                            teamId_judgeId_criteriaId: {
                                teamId: input.teamId,
                                judgeId: judgeUserId,
                                criteriaId: criteriaId
                            }
                        },
                        create: {
                            teamId: input.teamId,
                            judgeId: judgeUserId,
                            criteriaId: criteriaId,
                            score: input.criteriaScores[criteriaId],
                        },
                        update: {
                            score: input.criteriaScores[criteriaId],
                        }
                    });
                }

                // 2. Update Submission with the calculated final score (0-100)
                // Note: This overrides previous score. In a real multi-judge system, 
                // we might want to average across all judges.
                // For now, let's assume one judge or last-write-wins for the main display.

                // OPTIONAL: Calculate average across ALL judges
                /*
                const allJudgeScores = await tx.judgeScore.findMany({
                    where: { teamId: input.teamId },
                    include: { criteria: true }
                });
                // ... complex averaging logic ...
                */

                await tx.submission.update({
                    where: { id: team.submission!.id },
                    data: {
                        judgeScore: finalScore,
                        judgeComments: input.comments,
                    }
                });
            });

            // Log activity
            await ctx.prisma.activityLog.create({
                data: {
                    userId: judgeUserId, // Use the resolved User ID
                    action: "team.judged",
                    entity: "Team",
                    entityId: input.teamId,
                    metadata: {
                        finalScore,
                        criteriaScores: input.criteriaScores,
                        comments: input.comments,
                        judgeName: ctx.user.name
                    }
                }
            });

            return { success: true };
        }),
});
