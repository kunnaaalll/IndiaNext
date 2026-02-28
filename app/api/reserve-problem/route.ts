import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ success: false, message: 'Missing session ID.' }, { status: 400 });
    }

    // 1. Cleanup expired reservations globally to free up slots
    await prisma.problemReservation.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    // We will do all the read/write inside a transaction to prevent race conditions as much as possible,
    // though Prisma's interactive transactions are needed here.
    return await prisma.$transaction(async (tx) => {
      // 2. Check if this session already has an ACTIVE reservation
      const existingReservation = await tx.problemReservation.findUnique({
        where: { sessionId },
        include: { problemStatement: true },
      });

      if (existingReservation) {
        // Extend the expiry by 15 minutes since they are still active
        await tx.problemReservation.update({
          where: { id: existingReservation.id },
          data: { expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
        });

        return NextResponse.json({
          success: true,
          data: {
            id: existingReservation.problemStatement.id,
            title: existingReservation.problemStatement.title,
            objective: existingReservation.problemStatement.objective,
          },
        });
      }

      // 3. No existing reservation. Need to find the current active problem.
      // We will loop through available problems starting from the "current" one.
      const availableProblems = await tx.problemStatement.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      });

      let selectedProblemId = null;

      // Find the first problem (starting from current) that has capacity
      // Capacity = MaxSubmissions - ActualSubmissions - ActiveReservations
      for (const problem of availableProblems) {
        const activeReservationsCount = await tx.problemReservation.count({
          where: { problemStatementId: problem.id },
        });

        const totalCommitted = problem.submissionCount + activeReservationsCount;

        if (totalCommitted < problem.maxSubmissions) {
          selectedProblemId = problem.id;
          
          // Ensure this problem is marked as current if it's not already
          if (!problem.isCurrent) {
            // Unmark any others
            await tx.problemStatement.updateMany({
              where: { isCurrent: true },
              data: { isCurrent: false },
            });
            // Mark this as current
            await tx.problemStatement.update({
              where: { id: problem.id },
              data: { isCurrent: true },
            });
          }
          break;
        }
      }

      if (!selectedProblemId) {
        // Check if we can expand capacity from 30 to 50 slots per problem
        const canExpand = availableProblems.some(p => p.maxSubmissions < 50);

        if (canExpand) {
          // 1. Expand maxSubmissions for all active problems to 50
          await tx.problemStatement.updateMany({
            where: { isActive: true },
            data: { maxSubmissions: 50 },
          });

          // 2. Reset the rotation to start again from the first problem
          const firstProblem = availableProblems[0];
          if (firstProblem) {
             await tx.problemStatement.updateMany({
                where: { isActive: true },
                data: { isCurrent: false },
             });
             await tx.problemStatement.update({
                where: { id: firstProblem.id },
                data: { isCurrent: true },
             });

             selectedProblemId = firstProblem.id;
          }
        }
      }

      if (!selectedProblemId) {
        // All problem statements are completely full, even after expansion check
        return NextResponse.json({
          success: true,
          data: null,
          message: 'All problem statements have been fully reserved or filled.',
          allFilled: true,
        });
      }

      // 4. Create the new reservation for 15 minutes
      const newReservation = await tx.problemReservation.create({
        data: {
          sessionId,
          problemStatementId: selectedProblemId,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes holding
        },
        include: { problemStatement: true },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: newReservation.problemStatement.id,
          title: newReservation.problemStatement.title,
          objective: newReservation.problemStatement.objective,
        },
        allFilled: false,
      });
    }, {
      timeout: 10000,
      isolationLevel: 'Serializable', // Prevent race conditions
    });

  } catch (error) {
    console.error('[ReserveProblem] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to reserve problem slot.' }, { status: 500 });
  }
}
