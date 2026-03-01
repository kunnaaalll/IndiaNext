import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const criteriaRouter = router({
    // ═══════════════════════════════════════════════════════════
    // PUBLIC / JUDGE ACCESS
    // ═══════════════════════════════════════════════════════════

    getByTrack: publicProcedure
        .input(z.object({ track: z.enum(["IDEA_SPRINT", "BUILD_STORM"]) }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.judgingCriteria.findMany({
                where: {
                    track: input.track,
                    isActive: true,
                },
                orderBy: {
                    createdAt: "asc",
                },
            });
        }),

    getAll: adminProcedure.query(async ({ ctx }) => {
        // Fetch all criteria for admin management
        return ctx.prisma.judgingCriteria.findMany({
            orderBy: [
                { track: "asc" },
                { createdAt: "asc" },
            ],
        });
    }),

    // ═══════════════════════════════════════════════════════════
    // ADMIN MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    create: adminProcedure
        .input(z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            weight: z.number().min(0).default(1.0),
            track: z.enum(["IDEA_SPRINT", "BUILD_STORM"]),
            maxScore: z.number().min(1).default(10),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.judgingCriteria.create({
                data: {
                    name: input.name,
                    description: input.description,
                    weight: input.weight,
                    track: input.track,
                    maxScore: input.maxScore,
                },
            });
        }),

    update: adminProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1).optional(),
            description: z.string().optional(),
            weight: z.number().min(0).optional(),
            maxScore: z.number().min(1).optional(),
            isActive: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.judgingCriteria.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                    description: input.description,
                    weight: input.weight,
                    maxScore: input.maxScore,
                    isActive: input.isActive,
                },
            });
        }),

    delete: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.judgingCriteria.delete({
                where: { id: input.id },
            });
        }),
});
