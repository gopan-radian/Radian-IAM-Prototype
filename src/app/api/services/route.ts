import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - List all services or services for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    // Get all available services
    const services = await prisma.serviceMaster.findMany({
      where: { serviceStatus: 'ACTIVE' },
      orderBy: { serviceName: 'asc' },
    });

    // If companyId provided, include company's service status
    if (companyId) {
      const companyServices = await prisma.companyService.findMany({
        where: { companyId },
      });

      const enabledMap = new Map(
        companyServices.map((cs) => [cs.serviceId, cs.isEnabled])
      );

      const servicesWithStatus = services.map((service) => ({
        ...service,
        isEnabled: enabledMap.get(service.serviceId) ?? false,
      }));

      return NextResponse.json(servicesWithStatus);
    }

    return NextResponse.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

// POST - Enable/disable services for a company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, serviceId, isEnabled } = body as {
      companyId: string;
      serviceId: string;
      isEnabled: boolean;
    };

    if (!companyId || !serviceId || typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'companyId, serviceId, and isEnabled are required' },
        { status: 400 }
      );
    }

    // Verify company exists
    const company = await prisma.companyMaster.findUnique({
      where: { companyId },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Verify service exists
    const service = await prisma.serviceMaster.findUnique({
      where: { serviceId },
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Upsert company service
    const companyService = await prisma.companyService.upsert({
      where: {
        companyId_serviceId: { companyId, serviceId },
      },
      update: { isEnabled },
      create: {
        companyId,
        serviceId,
        isEnabled,
      },
      include: {
        service: true,
      },
    });

    return NextResponse.json(companyService);
  } catch (error) {
    console.error('Error updating company service:', error);
    return NextResponse.json(
      { error: 'Failed to update company service' },
      { status: 500 }
    );
  }
}
