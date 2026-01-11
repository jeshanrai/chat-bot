-- Migration 003: Add Reservations Enhancements
-- Future migration for table booking features

-- Tables configuration
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    table_number INTEGER UNIQUE NOT NULL,
    capacity INTEGER NOT NULL,
    location VARCHAR(50),          -- 'indoor', 'outdoor', 'private'
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed some tables
INSERT INTO tables (table_number, capacity, location) VALUES
(1, 2, 'indoor'),
(2, 2, 'indoor'),
(3, 4, 'indoor'),
(4, 4, 'indoor'),
(5, 6, 'indoor'),
(6, 4, 'outdoor'),
(7, 4, 'outdoor'),
(8, 8, 'private'),
(9, 10, 'private'),
(10, 2, 'outdoor'),
(11, 4, 'indoor'),
(12, 6, 'indoor')
ON CONFLICT (table_number) DO NOTHING;

-- Add foreign key to reservations if tables exist
-- ALTER TABLE reservations ADD CONSTRAINT fk_table 
--   FOREIGN KEY (table_number) REFERENCES tables(table_number);
