// src/app/api/db-status/route.js
import { connectToDatabase } from '../../../database';

export async function GET() {
  try {
    const connection = await connectToDatabase();
    if (connection) {
      connection.end(); // Close the connection after testing
      return new Response(JSON.stringify({ status: 'success', message: 'Database connected successfully!' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ status: 'error', message: 'Failed to connect to database.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ status: 'error', message: `Database connection failed: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}