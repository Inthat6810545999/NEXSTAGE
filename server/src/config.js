import 'dotenv/config';
import mysql from 'mysql2/promise';
import mongoose from 'mongoose';

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3307),
  user: process.env.MYSQL_USER || 'nexstage',
  password: process.env.MYSQL_PASSWORD || 'nexstagepass',
  database: process.env.MYSQL_DATABASE || 'nexstage',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true
});

export async function connectMongo() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexstage';
  if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(uri)) {
    throw new Error('MongoDB must be local. Check MONGODB_URI.');
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
}
