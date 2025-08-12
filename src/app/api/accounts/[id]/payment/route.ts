import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../database.js';
import { cookies } from 'next/headers';

// POST - Registrar pagamento de uma conta
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let connection;
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

    connection = await connectToDatabase();

    // Verificar se a conta existe e está pendente
    const [accountRows] = await connection.execute(
      'SELECT * FROM accounts WHERE id = ?',
      [accountId]
    ) as [{ id: number; status: string; amount: number; [key: string]: unknown }[], unknown];

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

    // Atualizar a conta com o pagamento
    await connection.execute(
      `UPDATE accounts 
       SET status = ?, payment_date = ?, payment_amount = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newStatus, payment_date, totalPaid.toFixed(2), notes || account.notes, accountId]
    );

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
  } finally {
    if (connection) connection.end();
  }
}