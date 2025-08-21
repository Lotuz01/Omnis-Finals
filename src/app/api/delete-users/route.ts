import { NextResponse } from 'next/server';
import { executeQuery } from '../../../database.js';

export async function POST() {
  try {
    await executeQuery('DELETE FROM users');
    return NextResponse.json({ message: 'All users deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting users:', error);
    return NextResponse.json({ message: 'Failed to delete users' }, { status: 500 });
  }
}