import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { updateAddress, deleteAddress } from '@/lib/db-addresses';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { label, address, currency, network, isDefault } = await request.json();

    // Auto-generate label if not provided and currency is being updated
    let updateData: any = {
      address,
      currency,
      network,
      isDefault,
    };

    // If label is provided, use it; otherwise auto-generate if currency is provided
    if (label !== undefined) {
      updateData.label = label;
    } else if (currency) {
      updateData.label = `${currency}${network ? ` (${network})` : ''} Address`;
    }

    const updated = await updateAddress(params.id, updateData);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Address not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      address: updated,
    });
  } catch (error: any) {
    console.error('Update address error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const success = await deleteAddress(params.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Address not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete address error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

