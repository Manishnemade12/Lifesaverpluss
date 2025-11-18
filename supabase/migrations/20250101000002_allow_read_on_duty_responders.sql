-- Allow anyone to read verified and on-duty responders for SOS assignment
-- This is critical: when no hospital is within 5km, SOS requests need to be assigned to responders
-- Users need to be able to query responder_details to find available responders

CREATE POLICY IF NOT EXISTS "Anyone can view verified on-duty responders for SOS assignment"
  ON public.responder_details FOR SELECT
  USING (is_verified = true AND is_on_duty = true);

