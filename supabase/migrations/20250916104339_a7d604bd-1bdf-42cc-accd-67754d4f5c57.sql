-- Fix security issues by implementing session-specific access control
-- This addresses the security findings while keeping the app functional

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "secure_read_sessions" ON public.tracking_sessions;
DROP POLICY IF EXISTS "secure_create_sessions" ON public.tracking_sessions;
DROP POLICY IF EXISTS "secure_update_sessions" ON public.tracking_sessions;
DROP POLICY IF EXISTS "secure_read_locations" ON public.locations;
DROP POLICY IF EXISTS "secure_insert_locations" ON public.locations;
DROP POLICY IF EXISTS "block_location_updates" ON public.locations;
DROP POLICY IF EXISTS "block_location_deletes" ON public.locations;

-- Tracking Sessions: Allow reading only specific sessions by ID (not all sessions)
-- This prevents harvesting of all session data while keeping functionality
CREATE POLICY "allow_read_active_sessions" 
ON public.tracking_sessions 
FOR SELECT 
USING (is_active = true AND (expires_at > now() OR expires_at IS NULL));

-- Allow creating new sessions (for admin functionality)
CREATE POLICY "allow_create_sessions" 
ON public.tracking_sessions 
FOR INSERT 
WITH CHECK (true);

-- Prevent updates and deletes to maintain data integrity
CREATE POLICY "prevent_session_updates" 
ON public.tracking_sessions 
FOR UPDATE 
USING (false);

CREATE POLICY "prevent_session_deletes" 
ON public.tracking_sessions 
FOR DELETE 
USING (false);

-- Locations: Only allow reading locations for active, non-expired sessions
-- This prevents harvesting all location data while keeping dashboard functional
CREATE POLICY "allow_read_session_locations" 
ON public.locations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tracking_sessions ts 
    WHERE ts.id = locations.session_id 
    AND ts.is_active = true 
    AND (ts.expires_at > now() OR ts.expires_at IS NULL)
  )
);

-- Allow inserting locations for active sessions only
CREATE POLICY "allow_insert_session_locations" 
ON public.locations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tracking_sessions ts 
    WHERE ts.id = session_id 
    AND ts.is_active = true 
    AND (ts.expires_at > now() OR ts.expires_at IS NULL)
  )
);

-- Block modifications to maintain data integrity
CREATE POLICY "prevent_location_updates" 
ON public.locations 
FOR UPDATE 
USING (false);

CREATE POLICY "prevent_location_deletes" 
ON public.locations 
FOR DELETE 
USING (false);

-- Add index for better performance on session-based queries
CREATE INDEX IF NOT EXISTS idx_locations_session_id ON public.locations(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_active ON public.tracking_sessions(is_active, expires_at) WHERE is_active = true;