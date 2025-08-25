import { midtransService } from '@/lib/midtrans';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

      const status = await midtransService.getTransactionStatus(orderId);

      return NextResponse.json({
        success: true,
        data: status,
      });


  } catch (error) {
    console.error('Payment status error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get payment status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}