-- Migration: Add timer and auto-mode support
-- Run this to upgrade existing databases

-- Add timer fields to quiz table
ALTER TABLE quiz ADD COLUMN answer_time_seconds INTEGER DEFAULT 30;
ALTER TABLE quiz ADD COLUMN scoreboard_pause_seconds INTEGER DEFAULT 10;

-- Add auto-mode and timing fields to session table
ALTER TABLE session ADD COLUMN auto_mode INTEGER DEFAULT 0;
ALTER TABLE session ADD COLUMN question_started_at INTEGER;
ALTER TABLE session ADD COLUMN current_phase TEXT DEFAULT 'waiting';

-- Add response time tracking to response table
ALTER TABLE response ADD COLUMN response_time_ms INTEGER;
