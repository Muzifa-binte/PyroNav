-- =============================================================================
-- One-time setup for a natively installed PostgreSQL (not needed with Docker
-- Compose, which creates the user and database itself).
--
-- Run as a superuser:
--     psql -U postgres -f backend/database/setup_database.sql
--
-- Change the password here AND in backend/.env (DB_PASSWORD).
-- =============================================================================

CREATE USER pyronav_user WITH PASSWORD 'secure_password';

-- Making pyronav_user the OWNER matters: since PostgreSQL 15, a plain
-- "GRANT ALL ON DATABASE" no longer allows creating tables in the public schema,
-- so migrations would fail with "permission denied for schema public".
CREATE DATABASE pyronav_db OWNER pyronav_user ENCODING 'UTF8';

-- All PyroNav timestamps are stored as UTC
ALTER DATABASE pyronav_db SET timezone TO 'UTC';
