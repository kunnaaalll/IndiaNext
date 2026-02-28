import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/problem-statement
 * 
 * Returns the currently active problem statement for the BuildStorm track.
 * 
 * Rotation logic:
 *   1. Find the problem marked as `isCurrent = true` and `isActive = true`
 *   2. If it has reached `maxSubmissions`, auto-rotate to the next by `order`
 *   3. If no problem is current, activate the first available one
 *   4. If all problems are exhausted, return `allFilled: true`
 */
export async function GET() {
  try {
    // Step 1: Get the current problem statement
    let current = await prisma.problemStatement.findFirst({
      where: {
        isCurrent: true,
        isActive: true,
      },
    });

    // Step 2: If current is full, rotate to the next one
    if (current && current.submissionCount >= current.maxSubmissions) {
      // Unmark current
      await prisma.problemStatement.update({
        where: { id: current.id },
        data: { isCurrent: false },
      });

      // Find next available problem by order that still has capacity
      const allAvailable = await prisma.problemStatement.findMany({
        where: {
          isActive: true,
          order: { gt: current.order },
        },
        orderBy: { order: 'asc' },
      });

      const next = allAvailable.find((p: { submissionCount: number; maxSubmissions: number }) => p.submissionCount < p.maxSubmissions);

      if (next) {
        current = await prisma.problemStatement.update({
          where: { id: next.id },
          data: { isCurrent: true },
        });
      } else {
        current = null; // All problems exhausted
      }
    }

    // Step 3: If no current problem, try to activate the first available
    if (!current) {
      const allProblems = await prisma.problemStatement.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      });

      const firstAvailable = allProblems.find((p: { submissionCount: number; maxSubmissions: number }) => p.submissionCount < p.maxSubmissions);

      if (firstAvailable) {
        // Reset all isCurrent flags first
        await prisma.problemStatement.updateMany({
          where: { isCurrent: true },
          data: { isCurrent: false },
        });

        current = await prisma.problemStatement.update({
          where: { id: firstAvailable.id },
          data: { isCurrent: true },
        });
      }
    }

    // Step 4: No available problems
    if (!current) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'All problem statements have been filled. Registration for BuildStorm is currently closed.',
        allFilled: true,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: current.id,
        title: current.title,
        objective: current.objective,
        description: current.description,
        slotsRemaining: current.maxSubmissions - current.submissionCount,
        totalSlots: current.maxSubmissions,
      },
      allFilled: false,
    });
  } catch (error) {
    console.error('[ProblemStatement] Error fetching current:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch problem statement.',
      },
      { status: 500 }
    );
  }
}
