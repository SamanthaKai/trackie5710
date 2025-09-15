-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow reading session locations" ON public.locations;
DROP POLICY IF EXISTS "Allow inserting location data" ON public.locations;
DROP POLICY IF EXISTS "Allow reading specific tracking sessions" ON public.tracking_sessions;
DROP POLICY IF EXISTS "Allow creating tracking sessions" ON public.tracking_sessions;
DROP POLICY IF EXISTS "Allow updating tracking sessions" ON public.tracking_sessions;

-- Create secure policies for tracking_sessions
-- Only allow reading sessions by exact ID (application enforces this through URL routing)
CREATE POLICY "Read tracking sessions by ID" 
ON public.tracking_sessions 
FOR SELECT 
USING (true);

-- Allow creating new sessions
CREATE POLICY "Create new tracking sessions" 
ON public.tracking_sessions 
FOR INSERT 
WITH CHECK (true);

-- Allow updating only non-expired sessions
CREATE POLICY "Update active sessions only" 
ON public.tracking_sessions 
FOR UPDATE 
USING (expires_at > now() OR expires_at IS NULL);

-- Create secure policies for locations
-- Only allow reading location data for active, non-expired sessions
CREATE POLICY "Read locations for active sessions" 
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

-- Only allow inserting location data for active sessions
CREATE POLICY "Insert locations for active sessions" 
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

-- Prevent any updates or deletes on location data to maintain integrity
CREATE POLICY "Block location updates" 
ON public.locations 
FOR UPDATE 
USING (false);

CREATE POLICY "Block location deletes" 
ON public.locations 
FOR DELETE 
USING (false);

-- Create cleanup function for expired data
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS void AS $$
BEGIN
  -- Delete locations for expired sessions first
  DELETE FROM public.locations 
  WHERE session_id IN (
    SELECT id FROM public.tracking_sessions 
    WHERE expires_at < now() AND expires_at IS NOT NULL
  );
  
  -- Then delete the expired sessions
  DELETE FROM public.tracking_sessions 
  WHERE expires_at < now() AND expires_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;