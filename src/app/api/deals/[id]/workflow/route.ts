import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Execute a workflow action on a deal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, userId, companyId, comment } = body;

    if (!action || !userId || !companyId) {
      return NextResponse.json(
        { error: 'action, userId, and companyId are required' },
        { status: 400 }
      );
    }

    // Get the current deal
    const deal = await prisma.deal.findUnique({
      where: { dealId: id },
      include: {
        currentPhase: true,
        dealType: {
          include: {
            phases: {
              orderBy: { phaseOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    const phases = deal.dealType.phases;
    const currentPhaseIndex = phases.findIndex(
      (p) => p.dealPhaseId === deal.currentPhaseId
    );

    let newPhase: typeof deal.currentPhase | undefined = deal.currentPhase;
    let historyAction = action.toUpperCase();
    let description = '';

    switch (action) {
      case 'submit_for_review': {
        // Move from DRAFT to PENDING_REVIEW
        const foundPhase = phases.find((p) => p.phaseName === 'PENDING_REVIEW');
        if (!foundPhase) {
          return NextResponse.json(
            { error: 'PENDING_REVIEW phase not found' },
            { status: 400 }
          );
        }
        newPhase = foundPhase;
        historyAction = 'PHASE_CHANGED';
        description = 'Deal submitted for merchant review';
        break;
      }

      case 'resubmit': {
        // Move from CHANGES_REQUESTED back to PENDING_REVIEW
        const foundPhase = phases.find((p) => p.phaseName === 'PENDING_REVIEW');
        if (!foundPhase) {
          return NextResponse.json(
            { error: 'PENDING_REVIEW phase not found' },
            { status: 400 }
          );
        }
        newPhase = foundPhase;
        historyAction = 'PHASE_CHANGED';
        description = 'Deal resubmitted after changes';
        break;
      }

      case 'approve': {
        // Move to APPROVED
        const foundPhase = phases.find((p) => p.phaseName === 'APPROVED');
        if (!foundPhase) {
          return NextResponse.json(
            { error: 'APPROVED phase not found' },
            { status: 400 }
          );
        }
        newPhase = foundPhase;
        historyAction = 'PHASE_CHANGED';
        description = 'Deal approved by merchant';
        break;
      }

      case 'reject': {
        // Move to REJECTED
        const foundPhase = phases.find((p) => p.phaseName === 'REJECTED');
        if (!foundPhase) {
          return NextResponse.json(
            { error: 'REJECTED phase not found' },
            { status: 400 }
          );
        }
        newPhase = foundPhase;
        historyAction = 'PHASE_CHANGED';
        description = comment ? `Deal rejected: ${comment}` : 'Deal rejected by merchant';
        break;
      }

      case 'request_changes': {
        // Move to CHANGES_REQUESTED
        const foundPhase = phases.find((p) => p.phaseName === 'CHANGES_REQUESTED');
        if (!foundPhase) {
          return NextResponse.json(
            { error: 'CHANGES_REQUESTED phase not found' },
            { status: 400 }
          );
        }
        newPhase = foundPhase;
        historyAction = 'PHASE_CHANGED';
        description = comment
          ? `Changes requested: ${comment}`
          : 'Merchant requested changes to the deal';
        break;
      }

      case 'complete': {
        // Move to COMPLETED
        const foundPhase = phases.find((p) => p.phaseName === 'COMPLETED');
        if (!foundPhase) {
          return NextResponse.json(
            { error: 'COMPLETED phase not found' },
            { status: 400 }
          );
        }
        newPhase = foundPhase;
        historyAction = 'PHASE_CHANGED';
        description = 'Deal marked as completed';
        break;
      }

      case 'comment':
        // Just add a comment, no phase change
        historyAction = 'COMMENT';
        description = comment || 'Comment added';
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Update the deal phase if changed
    if (newPhase && newPhase.dealPhaseId !== deal.currentPhaseId) {
      await prisma.deal.update({
        where: { dealId: id },
        data: { currentPhaseId: newPhase.dealPhaseId },
      });
    }

    // Create history entry
    await prisma.dealHistory.create({
      data: {
        dealId: id,
        actionType: historyAction,
        previousPhaseId: deal.currentPhaseId,
        newPhaseId: newPhase?.dealPhaseId || deal.currentPhaseId,
        changedByUserId: userId,
        changedByCompanyId: companyId,
        changeDescription: description,
        newValue: comment ? { comment } : undefined,
      },
    });

    // Return updated deal
    const updatedDeal = await prisma.deal.findUnique({
      where: { dealId: id },
      include: {
        dealType: true,
        currentPhase: true,
        history: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    return NextResponse.json({
      message: description,
      deal: updatedDeal,
    });
  } catch (error) {
    console.error('Error executing workflow action:', error);
    return NextResponse.json(
      { error: 'Failed to execute workflow action' },
      { status: 500 }
    );
  }
}
