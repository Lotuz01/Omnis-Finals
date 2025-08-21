import { executeQuery } from '../../../database.js';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, password, name, isAdmin } = await request.json();

    if (!username || !password || !name) {
      return NextResponse.json({ message: 'Missing username, password or name' }, { status: 400 });
    }

    // Check if user already exists
    const [existingUsers] = await executeQuery(
      'SELECT * FROM users WHERE username = ?', [username]
    );

    if ((existingUsers as unknown[]).length > 0) {
      return NextResponse.json({ message: 'User already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10); // Hash password with salt rounds = 10

    await executeQuery(
      'INSERT INTO users (username, password, name, is_admin) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, name, isAdmin || false]
    );

    return NextResponse.json({ message: 'User registered successfully' }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error during user registration:', error);
    return NextResponse.json({ message: 'Internal server error', error: (error as Error).message }, { status: 500 });
  }
}