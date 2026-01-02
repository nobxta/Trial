import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserAddresses, createAddress } from '@/lib/db-addresses';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const addresses = await getUserAddresses(authUser.userId);

    return NextResponse.json({
      success: true,
      addresses,
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { label, address, currency, network, isDefault } = await request.json();

    if (!address || !currency) {
      return NextResponse.json(
        { success: false, error: 'Address and currency are required' },
        { status: 400 }
      );
    }

    // Auto-generate label if not provided
    const generatedLabel = label || `${currency}${network ? ` (${network})` : ''} Address`;

    const newAddress = await createAddress(authUser.userId, {
      label: generatedLabel,
      address,
      currency,
      network,
      isDefault: isDefault || false,
    });

    return NextResponse.json({
      success: true,
      address: newAddress,
    });
  } catch (error: any) {
    console.error('Create address error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

