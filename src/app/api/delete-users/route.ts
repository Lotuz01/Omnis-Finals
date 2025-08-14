import { NextResponse } from 'next/server';
import { dbPool } from '../../../utils/database-pool';

export async function POST() {
  try {
    await dbPool.execute('DELETE FROM users');
    return NextResponse.json({ message: 'All users deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting users:', error);
    return NextResponse.json({ message: 'Failed to delete users' }, { status: 500 });
  }
}