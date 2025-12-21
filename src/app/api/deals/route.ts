import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get deals for the current company context
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const companyType = searchParams.get('companyType');

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    // Get deals where this company is either owner or counterparty
    const deals = await prisma.deal.findMany({
      where: {
        OR: [
          { ownerCompanyId: companyId },
          { counterpartyCompanyId: companyId },
        ],
        dealStatus: { not: 'DELETED' },
      },
      include: {
        dealType: true,
        currentPhase: true,
        participants: true,
        history: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with company names
    const companyIds = new Set<string>();
    deals.forEach((deal) => {
      companyIds.add(deal.ownerCompanyId);
      companyIds.add(deal.counterpartyCompanyId);
    });

    const companies = await prisma.companyMaster.findMany({
      where: { companyId: { in: Array.from(companyIds) } },
      select: { companyId: true, companyName: true, companyType: true },
    });

    const companyMap = new Map(companies.map((c) => [c.companyId, c]));

    const enrichedDeals = deals.map((deal) => ({
      ...deal,
      ownerCompany: companyMap.get(deal.ownerCompanyId),
      counterpartyCompany: companyMap.get(deal.counterpartyCompanyId),
      // Determine if current company is the owner or counterparty
      isOwner: deal.ownerCompanyId === companyId,
      // Determine what actions are available based on phase and role
      availableActions: getAvailableActions(deal, companyId, companyType || ''),
    }));

    return NextResponse.json(enrichedDeals);
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals' },
      { status: 500 }
    );
  }
}

// POST - Create a new deal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      dealTypeId,
      companyRelationshipId,
      ownerCompanyId,
      counterpartyCompanyId,
      dealTitle,
      dealDescription,
      dealAmount,
      dealCurrency,
      startDate,
      endDate,
      createdByUserId,
      metadata,
    } = body;

    // Validate required fields
    if (!dealTypeId || !companyRelationshipId || !ownerCompanyId || !counterpartyCompanyId || !dealTitle || !createdByUserId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the initial phase for this deal type
    const initialPhase = await prisma.dealPhase.findFirst({
      where: { dealTypeId, phaseStatus: 'ACTIVE' },
      orderBy: { phaseOrder: 'asc' },
    });

    if (!initialPhase) {
      return NextResponse.json(
        { error: 'No phases defined for this deal type' },
        { status: 400 }
      );
    }

    // Generate deal number
    const dealCount = await prisma.deal.count();
    const dealNumber = `DEAL-${String(dealCount + 1).padStart(5, '0')}`;

    // Create the deal
    const deal = await prisma.deal.create({
      data: {
        dealNumber,
        dealTypeId,
        currentPhaseId: initialPhase.dealPhaseId,
        companyRelationshipId,
        ownerCompanyId,
        counterpartyCompanyId,
        dealTitle,
        dealDescription,
        dealAmount: dealAmount ? parseFloat(dealAmount) : null,
        dealCurrency: dealCurrency || 'USD',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdByUserId,
        metadata: metadata || {},
      },
      include: {
        dealType: true,
        currentPhase: true,
      },
    });

    // Add creator as a participant
    await prisma.dealParticipant.create({
      data: {
        dealId: deal.dealId,
        userId: createdByUserId,
        companyId: ownerCompanyId,
        participantRole: 'OWNER',
      },
    });

    // Create initial history entry
    await prisma.dealHistory.create({
      data: {
        dealId: deal.dealId,
        actionType: 'CREATED',
        newPhaseId: initialPhase.dealPhaseId,
        changedByUserId: createdByUserId,
        changedByCompanyId: ownerCompanyId,
        changeDescription: `Deal created: ${dealTitle}`,
        newValue: {
          dealTitle,
          dealAmount,
          phase: initialPhase.phaseName,
        },
      },
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error('Error creating deal:', error);
    return NextResponse.json(
      { error: 'Failed to create deal' },
      { status: 500 }
    );
  }
}

function getAvailableActions(
  deal: any,
  currentCompanyId: string,
  companyType: string
): string[] {
  const actions: string[] = ['view'];
  const phaseName = deal.currentPhase?.phaseName;
  const isOwner = deal.ownerCompanyId === currentCompanyId;
  const isCounterparty = deal.counterpartyCompanyId === currentCompanyId;

  // SUPPLIER created the deal - can edit in DRAFT, submit for review
  if (isOwner) {
    if (phaseName === 'DRAFT') {
      actions.push('edit', 'submit_for_review', 'delete');
    } else if (phaseName === 'CHANGES_REQUESTED') {
      actions.push('edit', 'resubmit');
    }
  }

  // MERCHANT reviews the deal
  if (isCounterparty && companyType === 'MERCHANT') {
    if (phaseName === 'PENDING_REVIEW') {
      actions.push('approve', 'reject', 'request_changes');
    }
  }

  return actions;
}
