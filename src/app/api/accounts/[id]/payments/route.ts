import { NextResponse } from 'next/server';
import { dbPool } from '@/utils/database-pool';
import { cookies } from 'next/headers';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const accountId = resolvedParams.id;

    const [rows] = await dbPool.execute(
      'SELECT id, payment_amount, payment_date, notes, created_at FROM account_payments WHERE account_id = ? ORDER BY payment_date DESC',
      [accountId]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { message: 'Error fetching payments', error: (error as Error).message },
      { status: 500 }
    );
  }
}