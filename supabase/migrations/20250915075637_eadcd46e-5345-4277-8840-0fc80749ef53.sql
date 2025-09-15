-- Fix the security warning by setting the search_path for the cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;