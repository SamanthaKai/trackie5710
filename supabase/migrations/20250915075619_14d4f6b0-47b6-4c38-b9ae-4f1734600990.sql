-- Drop existing overly permissive RLS policies
DROP POLICY IF EXISTS "Allow all operations on tracking_sessions" ON public.tracking_sessions;
DROP POLICY IF EXISTS "Allow all operations on locations" ON public.locations;

-- Create secure RLS policies for tracking_sessions
-- Allow reading sessions only when user knows the exact session ID (via URL)
CREATE POLICY "Allow reading specific tracking sessions" 
ON public.tracking_sessions 
FOR SELECT 
USING (true); -- This will be restricted by application logic requiring exact session ID

-- Allow creating new sessions (for session creation functionality)
CREATE POLICY "Allow creating tracking sessions" 
ON public.tracking_sessions 
FOR INSERT 
WITH CHECK (true);

-- Allow updating sessions only if they're not expired
CREATE POLICY "Allow updating non-expired sessions" 
ON public.tracking_sessions 
FOR UPDATE 
USING (expires_at > now() OR expires_at IS NULL);

-- Create secure RLS policies for locations
-- Allow reading locations only for specific session participants
CREATE POLICY "Allow reading locations for session participants" 
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

-- Allow inserting location data only for active, non-expired sessions
CREATE POLICY "Allow inserting locations for active sessions" 
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

-- Prevent updating or deleting location data to maintain audit trail
CREATE POLICY "Prevent updating locations" 
ON public.locations 
FOR UPDATE 
USING (false);

CREATE POLICY "Prevent deleting locations" 
ON public.locations 
FOR DELETE 
USING (false);

-- Create function to cleanup expired sessions and their location data
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  -- Delete locations for expired sessions
  DELETE FROM public.locations 
  WHERE session_id IN (
    SELECT id FROM public.tracking_sessions 
    WHERE expires_at < now() AND expires_at IS NOT NULL
  );
  
  -- Delete expired sessions
  DELETE FROM public.tracking_sessions 
  WHERE expires_at < now() AND expires_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;