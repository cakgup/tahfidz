-- Migration: Promote cakgup@guru.tahfidz to admin
-- Run this migration to give super admin access to the specified user

UPDATE users 
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE lower(email) = 'cakgup@guru.tahfidz';

-- Verify the change
SELECT id, name, email, role, status FROM users WHERE lower(email) = 'cakgup@guru.tahfidz';
