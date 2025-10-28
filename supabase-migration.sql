-- Migration script to create the correct tables in Supabase
-- This will create the tables as defined in shared/schema.ts

-- Drop existing tables if they exist (BE CAREFUL - this will delete data!)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Create messages table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  companion_id TEXT,
  photo_url TEXT,
  is_premium BOOLEAN,
  context_info TEXT
);

-- Create conversations table
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  last_active TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_messages_companion_id ON messages(companion_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_conversations_last_active ON conversations(last_active);

-- Add comments for documentation
COMMENT ON TABLE messages IS 'Stores all chat messages between users and AI companions';
COMMENT ON TABLE conversations IS 'Stores conversation sessions';
COMMENT ON COLUMN messages.role IS 'Either "user" or "assistant"';
COMMENT ON COLUMN messages.companion_id IS 'The AI companion ID (e.g., "priya", "ananya")';
COMMENT ON COLUMN messages.photo_url IS 'URL to attached photo if present';
COMMENT ON COLUMN messages.is_premium IS 'True if this is a premium photo requiring payment';

