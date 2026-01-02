import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserOrders } from '@/lib/db-orders';

export async function GET(request: NextRequest) {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/account/orders/route.ts:GET',message:'Orders API called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'order-history',hypothesisId:'ORDERS_NOT_SHOWING'})}).catch(()=>{});
    // #endregion

    const authUser = await getAuthUser();
    if (!authUser) {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/account/orders/route.ts:GET',message:'Not authenticated',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'order-history',hypothesisId:'ORDERS_NOT_SHOWING'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = parseInt(searchParams.get('offset') || '0');

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/account/orders/route.ts:GET',message:'Fetching orders from DB',data:{userId:authUser.userId,status,limit,offset},timestamp:Date.now(),sessionId:'debug-session',runId:'order-history',hypothesisId:'ORDERS_NOT_SHOWING'})}).catch(()=>{});
    // #endregion

    const orders = await getUserOrders(authUser.userId, {
      status,
      limit,
      offset,
    });

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/account/orders/route.ts:GET',message:'Orders fetched from DB',data:{ordersCount:orders.length,orders:orders.slice(0,3).map(o=>({id:o.id,orderId:o.orderId,status:o.status}))},timestamp:Date.now(),sessionId:'debug-session',runId:'order-history',hypothesisId:'ORDERS_NOT_SHOWING'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      success: true,
      orders: orders || [],
    });
  } catch (error: any) {
    console.error('Get orders error:', error);
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/account/orders/route.ts:GET',message:'Orders API error',data:{error:error?.message||String(error),stack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'order-history',hypothesisId:'ORDERS_NOT_SHOWING'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}

