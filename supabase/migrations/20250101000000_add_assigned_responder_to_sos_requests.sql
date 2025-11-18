-- Add assigned_responder_id column to sos_requests table
ALTER TABLE public.sos_requests 
ADD COLUMN IF NOT EXISTS assigned_responder_id UUID REFERENCES public.profiles(id);

-- Update RLS policies to allow responders to view assigned SOS requests
CREATE POLICY IF NOT EXISTS "Responders can view assigned SOS requests"
  ON public.sos_requests FOR SELECT
  USING (auth.uid() = assigned_responder_id);

CREATE POLICY IF NOT EXISTS "Responders can update assigned SOS requests"
  ON public.sos_requests FOR UPDATE
  USING (auth.uid() = assigned_responder_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sos_requests_assigned_responder_id 
ON public.sos_requests(assigned_responder_id) 
WHERE assigned_responder_id IS NOT NULL;

