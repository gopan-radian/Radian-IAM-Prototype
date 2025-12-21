import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get a single deal by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deal = await prisma.deal.findUnique({
      where: { dealId: id },
      include: {
        dealType: {
          include: {
            phases: {
              orderBy: { phaseOrder: 'asc' },
            },
          },
        },
        currentPhase: true,
        participants: true,
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Get company info
    const [ownerCompany, counterpartyCompany] = await Promise.all([
      prisma.companyMaster.findUnique({
        where: { companyId: deal.ownerCompanyId },
        select: { companyId: true, companyName: true, companyType: true },
      }),
      prisma.companyMaster.findUnique({
        where: { companyId: deal.counterpartyCompanyId },
        select: { companyId: true, companyName: true, companyType: true },
      }),
    ]);

    return NextResponse.json({
      ...deal,
      ownerCompany,
      counterpartyCompany,
    });
  } catch (error) {
    console.error('Error fetching deal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deal' },
      { status: 500 }
    );
  }
}

// PUT - Update a deal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      dealTitle,
      dealDescription,
      dealAmount,
      dealCurrency,
      startDate,
      endDate,
      metadata,
      updatedByUserId,
      updatedByCompanyId,
    } = body;

    // Get current deal state for history
    const currentDeal = await prisma.deal.findUnique({
      where: { dealId: id },
      include: { currentPhase: true },
    });

    if (!currentDeal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Update the deal
    const updatedDeal = await prisma.deal.update({
      where: { dealId: id },
      data: {
        dealTitle,
        dealDescription,
        dealAmount: dealAmount ? parseFloat(dealAmount) : null,
        dealCurrency,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        metadata,
      },
      include: {
        dealType: true,
        currentPhase: true,
      },
    });

    // Create history entry
    await prisma.dealHistory.create({
      data: {
        dealId: id,
        actionType: 'UPDATED',
        changedByUserId: updatedByUserId,
        changedByCompanyId: updatedByCompanyId,
        changeDescription: 'Deal details updated',
        previousValue: {
          dealTitle: currentDeal.dealTitle,
          dealAmount: currentDeal.dealAmount?.toString(),
        },
        newValue: {
          dealTitle,
          dealAmount,
        },
      },
    });

    return NextResponse.json(updatedDeal);
  } catch (error) {
    console.error('Error updating deal:', error);
    return NextResponse.json(
      { error: 'Failed to update deal' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a deal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const companyId = searchParams.get('companyId');

    const deal = await prisma.deal.update({
      where: { dealId: id },
      data: { dealStatus: 'DELETED' },
    });

    // Create history entry
    await prisma.dealHistory.create({
      data: {
        dealId: id,
        actionType: 'UPDATED',
        changedByUserId: userId || 'system',
        changedByCompanyId: companyId || 'system',
        changeDescription: 'Deal deleted',
        newValue: { dealStatus: 'DELETED' },
      },
    });

    return NextResponse.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    return NextResponse.json(
      { error: 'Failed to delete deal' },
      { status: 500 }
    );
  }
}
