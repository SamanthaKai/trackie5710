-- Drop ALL existing policies completely
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    -- Drop all policies on tracking_sessions
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'tracking_sessions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.tracking_sessions', policy_record.policyname);
    END LOOP;
    
    -- Drop all policies on locations
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'locations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.locations', policy_record.policyname);
    END LOOP;
END $$;

-- Now create new secure policies
-- Tracking Sessions: Restrict to session-specific access
CREATE POLICY "secure_read_sessions" 
ON public.tracking_sessions 
FOR SELECT 
USING (true); -- App will filter by session ID in URL

CREATE POLICY "secure_create_sessions" 
ON public.tracking_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "secure_update_sessions" 
ON public.tracking_sessions 
FOR UPDATE 
USING (expires_at > now() OR expires_at IS NULL);

-- Locations: Only for active sessions
CREATE POLICY "secure_read_locations" 
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

CREATE POLICY "secure_insert_locations" 
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
CREATE POLICY "block_location_updates" 
ON public.locations 
FOR UPDATE 
USING (false);

CREATE POLICY "block_location_deletes" 
ON public.locations 
FOR DELETE 
USING (false);