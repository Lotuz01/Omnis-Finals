import { connectToDatabase } from './database.js';

async function checkAccountsStructure() {
  let connection;
  try {
    connection = await connectToDatabase();
    console.log('Conectado ao banco de dados MySQL!');

    // Verificar estrutura da tabela accounts
    console.log('\n=== ESTRUTURA DA TABELA ACCOUNTS ===');
    const [structure] = await connection.execute('DESCRIBE accounts');
    console.table(structure);

    // Verificar dados existentes
    console.log('\n=== DADOS EXISTENTES ===');
    const [rows] = await connection.execute('SELECT * FROM accounts LIMIT 5');
    console.table(rows);

    // Verificar se há contas com pagamento parcial
    console.log('\n=== VERIFICAR PAGAMENTOS PARCIAIS ===');
    const [partialPayments] = await connection.execute(
      'SELECT id, description, amount, payment_amount, (amount - COALESCE(payment_amount, 0)) as remaining FROM accounts WHERE payment_amount IS NOT NULL AND payment_amount < amount'
    );
    console.table(partialPayments);

  } catch (error) {
    console.error('Erro ao verificar estrutura:', error);
  } finally {
    if (connection) {
      connection.end();
      console.log('Conexão fechada.');
    }
  }
}

checkAccountsStructure();