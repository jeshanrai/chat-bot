-- =============================================
-- RESTAURANT BOT DATABASE SCHEMA
-- =============================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('superadmin', 'restaurant_owner', 'staff')),
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Foods Table
CREATE TABLE IF NOT EXISTS foods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    image_url TEXT,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,           -- Direct user ID (WhatsApp WAID or Messenger PSID)
    platform VARCHAR(20) DEFAULT 'whatsapp',
    status VARCHAR(50) DEFAULT 'pending',
    service_type VARCHAR(20),               -- 'dine_in' or 'delivery'
    delivery_address TEXT,
    payment_method VARCHAR(20),
    total_amount DECIMAL(10, 2),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    special_instructions TEXT,
    payment_verified BOOLEAN DEFAULT false,
    payment_screenshot_url TEXT,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    food_id INTEGER REFERENCES foods(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Tables Configuration (for Reservations)
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    table_number INTEGER UNIQUE NOT NULL,
    capacity INTEGER NOT NULL,
    location VARCHAR(50),                   -- 'indoor', 'outdoor', 'private'
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    table_number INTEGER NOT NULL,
    party_size INTEGER DEFAULT 2,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. Sessions Table (For managing temporary order state)
CREATE TABLE IF NOT EXISTS sessions (
    user_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'whatsapp', 'messenger'
    session_data JSONB DEFAULT '{}',     -- Temporary state (cart, current interaction step)
    last_active TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, platform)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);
CREATE INDEX IF NOT EXISTS idx_foods_available ON foods(available);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_platform ON orders(platform);
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(last_active);

-- =============================================
-- SEED DATA
-- =============================================

-- Users (Password hash is 'password123' - placeholder, typically should be bcrypt hash)
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@restaurant.com', '$2b$10$YourHashedPasswordHere', 'superadmin'),
('owner', 'owner@restaurant.com', '$2b$10$YourHashedPasswordHere', 'restaurant_owner'),
('staff1', 'staff@restaurant.com', '$2b$10$YourHashedPasswordHere', 'staff')
ON CONFLICT (username) DO NOTHING;

-- Tables
INSERT INTO tables (table_number, capacity, location) VALUES
(1, 4, 'indoor'),
(2, 2, 'indoor'),
(3, 6, 'indoor'),
(4, 4, 'outdoor'),
(5, 8, 'private')
ON CONFLICT (table_number) DO NOTHING;

-- Foods
INSERT INTO foods (name, description, price, category, image_url, available) VALUES
-- Momos
('Steamed Veg Momo', 'Fresh vegetables & herbs wrapped in soft dough, steamed to perfection', 180.00, 'momos', 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9', true),
('Steamed Chicken Momo', 'Juicy chicken filling in soft steamed dumplings', 220.00, 'momos', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb', true),
('Fried Veg Momo', 'Crispy fried vegetable momos with crunchy exterior', 200.00, 'momos', 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c', true),
('Fried Chicken Momo', 'Golden fried chicken momos, crispy and delicious', 240.00, 'momos', 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c', true),
('Jhol Momo', 'Steamed momos served in spicy soup gravy', 250.00, 'momos', 'https://images.unsplash.com/photo-1563245372-f21724e3856d', true),

-- Noodles
('Veg Thukpa', 'Traditional Tibetan noodle soup with vegetables', 200.00, 'noodles', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624', true),
('Chicken Thukpa', 'Hearty noodle soup with tender chicken pieces', 250.00, 'noodles', 'https://images.unsplash.com/photo-1552611052-33e04de081de', true),
('Veg Chowmein', 'Stir-fried noodles with fresh vegetables', 180.00, 'noodles', 'https://images.unsplash.com/photo-1585032226651-759b368d7246', true),
('Chicken Chowmein', 'Stir-fried noodles with chicken and vegetables', 220.00, 'noodles', 'https://images.unsplash.com/photo-1617093727343-374698b1b08d', true),

-- Rice
('Veg Fried Rice', 'Wok-tossed rice with mixed vegetables', 180.00, 'rice', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b', true),
('Chicken Fried Rice', 'Delicious fried rice with chicken pieces', 220.00, 'rice', 'https://images.unsplash.com/photo-1512058564366-18510be2db19', true),
('Chicken Biryani', 'Aromatic basmati rice with spiced chicken', 300.00, 'rice', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8', true),

-- Beverages
('Masala Tea', 'Traditional spiced tea', 40.00, 'beverages', 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f', true),
('Coffee', 'Hot brewed coffee', 60.00, 'beverages', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93', true),
('Mango Lassi', 'Creamy mango yogurt drink', 100.00, 'beverages', 'https://images.unsplash.com/photo-1527661591475-527312dd65f5', true)
ON CONFLICT DO NOTHING;
