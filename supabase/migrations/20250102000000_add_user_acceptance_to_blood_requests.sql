-- Add user acceptance functionality to blood_requests
-- Allows users to accept blood requests from other users

-- =====================================================
-- 1. Add columns for user acceptance
-- =====================================================
ALTER TABLE public.blood_requests
ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS user_response TEXT;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_blood_requests_accepted_by ON public.blood_requests(accepted_by);
CREATE INDEX IF NOT EXISTS idx_blood_requests_status_accepted ON public.blood_requests(status, accepted_by);

-- =====================================================
-- 2. Update RLS Policies
-- =====================================================

-- Users can update blood requests they accepted
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'blood_requests' 
    AND policyname = 'Users can update accepted blood requests'
  ) THEN
    CREATE POLICY "Users can update accepted blood requests"
      ON public.blood_requests FOR UPDATE
      USING (accepted_by = auth.uid());
  END IF;
END $$;

-- Users can accept active blood requests (update accepted_by)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'blood_requests' 
    AND policyname = 'Users can accept active blood requests'
  ) THEN
    CREATE POLICY "Users can accept active blood requests"
      ON public.blood_requests FOR UPDATE
      USING (
        status IN ('active', 'partially_fulfilled')
        AND accepted_by IS NULL
      )
      WITH CHECK (
        accepted_by = auth.uid()
      );
  END IF;
END $$;

-- =====================================================
-- 3. Trigger to set accepted_at timestamp
-- =====================================================

-- Function to set accepted_at when accepted_by is set
CREATE OR REPLACE FUNCTION public.set_blood_request_accepted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.accepted_by IS NOT NULL AND OLD.accepted_by IS NULL THEN
    NEW.accepted_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_set_blood_request_accepted_at ON public.blood_requests;
CREATE TRIGGER trigger_set_blood_request_accepted_at
  BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_blood_request_accepted_at();

-- =====================================================
-- 4. Trigger to update status when accepted
-- =====================================================

-- Function to update status when request is accepted
CREATE OR REPLACE FUNCTION public.update_blood_request_on_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- When a request is accepted, we can optionally update status
  -- For now, we'll keep it as active/partially_fulfilled until donation is recorded
  IF NEW.accepted_by IS NOT NULL AND OLD.accepted_by IS NULL THEN
    -- Request is now accepted, but still active until donation
    -- Status will be updated when donation is recorded
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_blood_request_on_acceptance ON public.blood_requests;
CREATE TRIGGER trigger_update_blood_request_on_acceptance
  AFTER UPDATE ON public.blood_requests
  FOR EACH ROW
  WHEN (NEW.accepted_by IS NOT NULL AND OLD.accepted_by IS NULL)
  EXECUTE FUNCTION public.update_blood_request_on_acceptance();

