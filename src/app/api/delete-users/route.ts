import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../database';

export async function POST() {
  let connection;
  try {
    connection = await connectToDatabase();
    await connection.execute('DELETE FROM users');
    return NextResponse.json({ message: 'All users deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting users:', error);
    return NextResponse.json({ message: 'Failed to delete users' }, { status: 500 });
  } finally {
    if (connection) {
      connection.end();
    }
  }
}