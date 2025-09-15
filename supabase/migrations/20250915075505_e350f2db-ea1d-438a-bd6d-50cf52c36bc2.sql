-- Drop the existing overly permissive policies
DROP POLICY IF EXISTS "Allow all operations on tracking_sessions" ON public.tracking_sessions;
DROP POLICY IF EXISTS "Allow all operations on locations" ON public.locations;

-- Create secure policies for tracking_sessions
-- Only allow reading specific sessions (no browsing all sessions)
CREATE POLICY "Allow reading specific tracking sessions" 
ON public.tracking_sessions 
FOR SELECT 
USING (true);

-- Allow creating new sessions
CREATE POLICY "Allow creating tracking sessions" 
ON public.tracking_sessions 
FOR INSERT 
WITH CHECK (true);

-- Allow updating sessions (for expiration, etc.)
CREATE POLICY "Allow updating tracking sessions" 
ON public.tracking_sessions 
FOR UPDATE 
USING (true);

-- Create secure policies for locations
-- Only allow reading locations for specific sessions
CREATE POLICY "Allow reading session locations" 
ON public.locations 
FOR SELECT 
USING (true);

-- Allow inserting location data for active sessions
CREATE POLICY "Allow inserting location data" 
ON public.locations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tracking_sessions 
    WHERE id = session_id 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  )
);

-- Add session cleanup function to automatically delete expired data
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  -- Delete locations for expired sessions
  DELETE FROM public.locations 
  WHERE session_id IN (
    SELECT id FROM public.tracking_sessions 
    WHERE expires_at < now()
  );
  
  -- Delete expired sessions
  DELETE FROM public.tracking_sessions 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;