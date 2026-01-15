import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

const { Pool } = pg;

// Use DATABASE_URL for Neon/Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test connection on startup
pool.on('connect', () => {
    // console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err);
});

export default pool;
