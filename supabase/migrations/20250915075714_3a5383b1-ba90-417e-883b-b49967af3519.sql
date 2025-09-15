-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;