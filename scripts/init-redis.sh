#!/bin/bash

# Wait for Redis to be ready
sleep 5

# Connect to Redis and populate with sample data
redis-cli -a testpassword123 << 'EOF'

# Clear any existing data
FLUSHALL

# Set some sample keys with different TTLs and patterns
# User data with various TTLs
SET user:1:profile '{"name": "John Doe", "email": "john@example.com"}' EX 3600
SET user:2:profile '{"name": "Jane Smith", "email": "jane@example.com"}' EX 7200
SET user:3:profile '{"name": "Bob Johnson", "email": "bob@example.com"}' EX 1800
SET user:4:profile '{"name": "Alice Brown", "email": "alice@example.com"}' EX 86400
SET user:5:profile '{"name": "Charlie Wilson", "email": "charlie@example.com"}' EX 300

# Session data with short TTLs
SET session:abc123 '{"user_id": 1, "last_activity": "2024-01-01T10:00:00Z"}' EX 1800
SET session:def456 '{"user_id": 2, "last_activity": "2024-01-01T11:00:00Z"}' EX 1800
SET session:ghi789 '{"user_id": 3, "last_activity": "2024-01-01T12:00:00Z"}' EX 1800

# Cache data with medium TTLs
SET cache:product:1 '{"id": 1, "name": "Laptop", "price": 999.99}' EX 3600
SET cache:product:2 '{"id": 2, "name": "Mouse", "price": 29.99}' EX 3600
SET cache:product:3 '{"id": 3, "name": "Keyboard", "price": 89.99}' EX 3600
SET cache:product:4 '{"id": 4, "name": "Monitor", "price": 299.99}' EX 7200

# Analytics data with long TTLs
SET analytics:pageview:home:2024-01-01 1250 EX 86400
SET analytics:pageview:products:2024-01-01 890 EX 86400
SET analytics:pageview:about:2024-01-01 340 EX 86400

# Hash data
HSET user:1:preferences theme dark language en notifications true
HSET user:2:preferences theme light language es notifications false
HSET user:3:preferences theme dark language fr notifications true

# List data
LPUSH notifications:user:1 "Welcome to our platform!" "Your order has been shipped"
LPUSH notifications:user:2 "New product available" "Weekly newsletter"
LPUSH notifications:user:3 "Account verification required"

# Set data
SADD tags:product:1 "electronics" "laptop" "gaming" "portable"
SADD tags:product:2 "electronics" "accessories" "wireless"
SADD tags:product:3 "electronics" "accessories" "mechanical"

# Sorted set data
ZADD leaderboard:game:1 1000 "player1" 850 "player2" 1200 "player3" 750 "player4"
ZADD leaderboard:game:2 500 "player1" 650 "player2" 800 "player3" 450 "player4"

# Some keys with no TTL (persistent)
SET config:app:version "1.2.3"
SET config:app:environment "development"
SET config:app:debug "true"

# Keys with very short TTLs for testing
SET temp:lock:1 "locked" EX 60
SET temp:lock:2 "locked" EX 120
SET temp:lock:3 "locked" EX 30

# Keys with very long TTLs
SET permanent:user:1:settings '{"theme": "dark", "notifications": true}' EX 31536000
SET permanent:user:2:settings '{"theme": "light", "notifications": false}' EX 31536000

# Some keys that will expire soon (for testing idle time)
SET expiring:soon:1 "will expire" EX 10
SET expiring:soon:2 "will expire" EX 15
SET expiring:soon:3 "will expire" EX 20

echo "Sample data populated successfully!"

EOF
