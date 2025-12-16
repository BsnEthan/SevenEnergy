import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuration PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper pour exécuter des requêtes
export const query = (text, params) => pool.query(text, params);

// Helper pour obtenir un client (pour les transactions)
export const getClient = () => pool.connect();

export default pool;