import { NextResponse } from 'next/server';
import { dbPool } from '@/utils/database-pool';
import { cookies } from 'next/headers';
import { cache, CACHE_KEYS } from '../../../../../lib/cache';
import { invalidateCacheByRoute } from '../../../../../middleware/cache';

// POST - Registrar pagamento de uma conta
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { payment_amount, payment_date, notes } = await request.json();
    const resolvedParams = await params;
    const accountId = resolvedParams.id;

    if (!payment_amount || !payment_date) {
      return NextResponse.json(
        { message: 'Missing required fields: payment_amount, payment_date' },
        { status: 400 }
      );
    }

    if (payment_amount <= 0) {
      return NextResponse.json(
        { message: 'Payment amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Verificar se a conta existe - usando PRIMARY KEY
    const [accountRows] = await dbPool.execute(
      'SELECT id, status, amount, payment_amount, notes FROM accounts WHERE id = ? LIMIT 1',
      [accountId]
    ) as [{ id: number; status: string; amount: number; payment_amount?: number; notes?: string }[], unknown];

    if (accountRows.length === 0) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }

    const account = accountRows[0];

    if (account.status === 'pago') {
      return NextResponse.json(
        { message: 'Account is already paid' },
        { status: 400 }
      );
    }

    // Calcular valor já pago e valor restante
    const currentPaid = parseFloat(String(account.payment_amount || '0'));
    const totalAmount = parseFloat(String(account.amount));
    const newPaymentAmount = parseFloat(payment_amount);
    const totalPaid = currentPaid + newPaymentAmount;

    // Verificar se o pagamento não excede o valor total
    if (totalPaid > totalAmount) {
      return NextResponse.json(
        { 
          message: `Payment amount exceeds remaining balance. Remaining: ${(totalAmount - currentPaid).toFixed(2)}`,
          remaining: (totalAmount - currentPaid).toFixed(2)
        },
        { status: 400 }
      );
    }

    // Determinar o novo status
    let newStatus = 'pendente';
    if (totalPaid >= totalAmount) {
      newStatus = 'pago';
    } else if (totalPaid > 0) {
      newStatus = 'parcialmente_pago';
    }

    // Atualizar a conta com o pagamento - usando PRIMARY KEY
    await dbPool.execute(
      `UPDATE accounts 
       SET status = ?, payment_date = ?, payment_amount = ?, notes = ?, updated_at = NOW()
       WHERE id = ?`,
      [newStatus, payment_date, totalPaid.toFixed(2), notes || account.notes, accountId]
    );
    
    // Invalidar cache após pagamento
    await cache.del(`${CACHE_KEYS.ACCOUNTS}:*`);
    await invalidateCacheByRoute('/api/accounts');

    return NextResponse.json(
      { message: 'Payment registered successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error registering payment:', error);
    return NextResponse.json(
      { message: 'Error registering payment', error: (error as Error).message },
      { status: 500 }
    );
  }
}