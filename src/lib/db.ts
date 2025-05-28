import mysql from 'mysql2/promise';

// Basic connection function.
// In a serverless environment like Next.js API routes,
// creating a connection per request is a common pattern.
// For higher loads, consider connection pooling.
export async function getConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4', // Explicitly set charset
    });
    return connection;
  } catch (error) {
    console.error('Failed to create database connection:', error);
    throw new Error('Failed to connect to the database.');
  }
}
