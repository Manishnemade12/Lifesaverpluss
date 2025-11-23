-- =====================================================
-- CONSOLIDATED SCHEMA MIGRATION
-- This file contains all database schema, policies, triggers, and functions
-- for the Lifesaver Plus application
-- =====================================================

-- =====================================================
-- 1. CORE TABLES
-- =====================================================

-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  user_type TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'user_type', 'user') <> 'hospital' THEN
    INSERT INTO public.profiles (id, email, first_name, last_name, user_type)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      COALESCE(NEW.raw_user_meta_data->>'user_type', 'user')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create emergency_contacts table
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can manage their own emergency contacts"
  ON public.emergency_contacts FOR ALL
  USING (auth.uid() = user_id);

-- Create responder_details table
CREATE TABLE IF NOT EXISTS public.responder_details (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  responder_type TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  is_on_duty BOOLEAN DEFAULT false,
  current_location JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.responder_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Responders can view their own details" ON public.responder_details;
CREATE POLICY "Responders can view their own details"
  ON public.responder_details FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Responders can update their own details" ON public.responder_details;
CREATE POLICY "Responders can update their own details"
  ON public.responder_details FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Responders can insert their own details" ON public.responder_details;
CREATE POLICY "Responders can insert their own details"
  ON public.responder_details FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can view verified on-duty responders for SOS assignment" ON public.responder_details;
CREATE POLICY "Anyone can view verified on-duty responders for SOS assignment"
  ON public.responder_details FOR SELECT
  USING (is_verified = true AND is_on_duty = true);

-- Create hospital_profiles table
CREATE TABLE IF NOT EXISTS public.hospital_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  capacity INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  specialties TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hospital_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospitals can manage their own profile" ON public.hospital_profiles;
CREATE POLICY "Hospitals can manage their own profile"
  ON public.hospital_profiles FOR ALL
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Everyone can view hospital profiles" ON public.hospital_profiles;
CREATE POLICY "Everyone can view hospital profiles"
  ON public.hospital_profiles FOR SELECT
  USING (true);

-- Create sos_requests table
CREATE TABLE IF NOT EXISTS public.sos_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  emergency_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  assigned_hospital_id UUID REFERENCES public.hospital_profiles(id),
  assigned_responder_id UUID REFERENCES public.profiles(id),
  user_address TEXT,
  notes TEXT,
  estimated_arrival TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sos_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sos_requests_assigned_responder_id 
ON public.sos_requests(assigned_responder_id) 
WHERE assigned_responder_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can create their own SOS requests" ON public.sos_requests;
CREATE POLICY "Users can create their own SOS requests"
  ON public.sos_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own SOS requests" ON public.sos_requests;
CREATE POLICY "Users can view their own SOS requests"
  ON public.sos_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Hospitals can view assigned SOS requests" ON public.sos_requests;
CREATE POLICY "Hospitals can view assigned SOS requests"
  ON public.sos_requests FOR SELECT
  USING (auth.uid() = assigned_hospital_id);

DROP POLICY IF EXISTS "Hospitals can update assigned SOS requests" ON public.sos_requests;
CREATE POLICY "Hospitals can update assigned SOS requests"
  ON public.sos_requests FOR UPDATE
  USING (auth.uid() = assigned_hospital_id);

DROP POLICY IF EXISTS "Responders can view assigned SOS requests" ON public.sos_requests;
CREATE POLICY "Responders can view assigned SOS requests"
  ON public.sos_requests FOR SELECT
  USING (auth.uid() = assigned_responder_id);

DROP POLICY IF EXISTS "Responders can update assigned SOS requests" ON public.sos_requests;
CREATE POLICY "Responders can update assigned SOS requests"
  ON public.sos_requests FOR UPDATE
  USING (auth.uid() = assigned_responder_id);

-- Create emergency_alerts table
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  location_description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  responder_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own alerts" ON public.emergency_alerts;
CREATE POLICY "Users can create their own alerts"
  ON public.emergency_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own alerts" ON public.emergency_alerts;
CREATE POLICY "Users can view their own alerts"
  ON public.emergency_alerts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Responders can view all active alerts" ON public.emergency_alerts;
CREATE POLICY "Responders can view all active alerts"
  ON public.emergency_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.responder_details
      WHERE id = auth.uid() AND is_verified = true
    )
  );

DROP POLICY IF EXISTS "Responders can update alerts they respond to" ON public.emergency_alerts;
CREATE POLICY "Responders can update alerts they respond to"
  ON public.emergency_alerts FOR UPDATE
  USING (auth.uid() = responder_id OR auth.uid() = user_id);

-- Create anonymous_reports table
CREATE TABLE IF NOT EXISTS public.anonymous_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT NOT NULL,
  type TEXT,
  location TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  priority TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  responder_id UUID REFERENCES public.profiles(id),
  responded_at TIMESTAMPTZ,
  resolution_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.anonymous_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create anonymous reports" ON public.anonymous_reports;
CREATE POLICY "Anyone can create anonymous reports"
  ON public.anonymous_reports FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Responders can view all reports" ON public.anonymous_reports;
CREATE POLICY "Responders can view all reports"
  ON public.anonymous_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.responder_details
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Responders can update reports" ON public.anonymous_reports;
CREATE POLICY "Responders can update reports"
  ON public.anonymous_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.responder_details
      WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 2. MEDICAL REPORTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.medical_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  age INTEGER,
  blood_group TEXT,
  height_cm INTEGER,
  weight_kg NUMERIC,
  medical_history TEXT,
  current_conditions TEXT,
  medications TEXT,
  allergies TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  primary_physician_name TEXT,
  primary_physician_phone TEXT,
  background_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_medical_report UNIQUE (user_id)
);

ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own medical reports" ON public.medical_reports;
CREATE POLICY "Users can view their own medical reports"
  ON public.medical_reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own medical reports" ON public.medical_reports;
CREATE POLICY "Users can insert their own medical reports"
  ON public.medical_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own medical reports" ON public.medical_reports;
CREATE POLICY "Users can update their own medical reports"
  ON public.medical_reports FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Hospitals can view medical reports for assigned SOS requests" ON public.medical_reports;
CREATE POLICY "Hospitals can view medical reports for assigned SOS requests"
  ON public.medical_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sos_requests
      WHERE sos_requests.user_id = medical_reports.user_id
        AND sos_requests.assigned_hospital_id = auth.uid()
        AND sos_requests.status IN ('active', 'pending', 'acknowledged')
    )
  );

CREATE INDEX IF NOT EXISTS idx_medical_reports_user_id ON public.medical_reports(user_id);

-- =====================================================
-- 3. BLOOD DONATION SYSTEM TABLES
-- =====================================================

-- Blood Donors Table
CREATE TABLE IF NOT EXISTS public.blood_donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  is_available BOOLEAN DEFAULT true,
  last_donation_date DATE,
  next_available_date DATE,
  donation_count INTEGER DEFAULT 0,
  phone TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  health_declaration BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_blood_donors_user_id ON public.blood_donors(user_id);
CREATE INDEX IF NOT EXISTS idx_blood_donors_blood_group ON public.blood_donors(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_donors_is_available ON public.blood_donors(is_available);
CREATE INDEX IF NOT EXISTS idx_blood_donors_next_available_date ON public.blood_donors(next_available_date);
CREATE INDEX IF NOT EXISTS idx_blood_donors_location ON public.blood_donors(location_lat, location_lng) WHERE is_available = true;

-- Blood Requests Table
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_type TEXT NOT NULL CHECK (requester_type IN ('user', 'hospital')),
  hospital_id UUID REFERENCES public.hospital_profiles(id) ON DELETE SET NULL,
  blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  units_required INTEGER NOT NULL DEFAULT 1 CHECK (units_required > 0),
  units_received INTEGER DEFAULT 0,
  urgency_level TEXT NOT NULL DEFAULT 'normal' CHECK (urgency_level IN ('normal', 'urgent', 'critical')),
  patient_name TEXT,
  patient_age INTEGER,
  patient_condition TEXT,
  hospital_name TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_fulfilled', 'fulfilled', 'cancelled', 'expired')),
  expiry_date TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  user_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  fulfilled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_blood_requests_requester_id ON public.blood_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_blood_requests_hospital_id ON public.blood_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_group ON public.blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON public.blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_blood_requests_urgency ON public.blood_requests(urgency_level);
CREATE INDEX IF NOT EXISTS idx_blood_requests_created_at ON public.blood_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blood_requests_active_location ON public.blood_requests(blood_group, location_lat, location_lng) WHERE status IN ('active', 'partially_fulfilled');
CREATE INDEX IF NOT EXISTS idx_blood_requests_accepted_by ON public.blood_requests(accepted_by);
CREATE INDEX IF NOT EXISTS idx_blood_requests_status_accepted ON public.blood_requests(status, accepted_by);

-- Blood Donations Table
CREATE TABLE IF NOT EXISTS public.blood_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES public.blood_donors(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.blood_requests(id) ON DELETE SET NULL,
  blood_group TEXT NOT NULL,
  units_donated INTEGER DEFAULT 1,
  donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  donation_location TEXT,
  verified_by UUID REFERENCES public.hospital_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blood_donations_donor_id ON public.blood_donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_blood_donations_request_id ON public.blood_donations(request_id);
CREATE INDEX IF NOT EXISTS idx_blood_donations_donation_date ON public.blood_donations(donation_date DESC);

-- Blood Chat/Messages Table
CREATE TABLE IF NOT EXISTS public.blood_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  hospital_request_id UUID REFERENCES public.user_hospital_blood_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (
    (request_id IS NOT NULL AND hospital_request_id IS NULL) OR
    (request_id IS NULL AND hospital_request_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_blood_chat_request_id ON public.blood_chat(request_id);
CREATE INDEX IF NOT EXISTS idx_blood_chat_hospital_request_id ON public.blood_chat(hospital_request_id);
CREATE INDEX IF NOT EXISTS idx_blood_chat_sender_id ON public.blood_chat(sender_id);
CREATE INDEX IF NOT EXISTS idx_blood_chat_receiver_id ON public.blood_chat(receiver_id);
CREATE INDEX IF NOT EXISTS idx_blood_chat_created_at ON public.blood_chat(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blood_chat_is_read ON public.blood_chat(is_read);
CREATE INDEX IF NOT EXISTS idx_blood_chat_conversation ON public.blood_chat(request_id, created_at DESC);

-- Hospital Blood Inventory Table
CREATE TABLE IF NOT EXISTS public.hospital_blood_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospital_profiles(id) ON DELETE CASCADE,
  blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  units_available INTEGER NOT NULL DEFAULT 0 CHECK (units_available >= 0),
  units_reserved INTEGER DEFAULT 0 CHECK (units_reserved >= 0),
  expiry_dates JSONB,
  last_updated TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hospital_id, blood_group)
);

CREATE INDEX IF NOT EXISTS idx_hospital_blood_inventory_hospital_id ON public.hospital_blood_inventory(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_blood_inventory_blood_group ON public.hospital_blood_inventory(blood_group);
CREATE INDEX IF NOT EXISTS idx_hospital_blood_inventory_units ON public.hospital_blood_inventory(units_available);

-- Hospital Blood Requests Table
CREATE TABLE IF NOT EXISTS public.hospital_blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospital_profiles(id) ON DELETE CASCADE,
  blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  units_required INTEGER NOT NULL DEFAULT 1 CHECK (units_required > 0),
  units_received INTEGER DEFAULT 0,
  urgency_level TEXT NOT NULL DEFAULT 'normal' CHECK (urgency_level IN ('normal', 'urgent', 'critical')),
  patient_name TEXT,
  patient_id TEXT,
  department TEXT,
  doctor_name TEXT,
  doctor_contact TEXT,
  reason TEXT,
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_fulfilled', 'fulfilled', 'cancelled')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  user_response TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  fulfilled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hospital_blood_requests_hospital_id ON public.hospital_blood_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_blood_requests_blood_group ON public.hospital_blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_hospital_blood_requests_status ON public.hospital_blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_hospital_blood_requests_urgency ON public.hospital_blood_requests(urgency_level);
CREATE INDEX IF NOT EXISTS idx_hospital_blood_requests_priority ON public.hospital_blood_requests(priority DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_blood_requests_accepted_by ON public.hospital_blood_requests(accepted_by);
CREATE INDEX IF NOT EXISTS idx_hospital_blood_requests_status_accepted ON public.hospital_blood_requests(status, accepted_by);

-- Blood Donor Requests Link Table
CREATE TABLE IF NOT EXISTS public.blood_donor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES public.blood_donors(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  donor_response_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(request_id, donor_id)
);

CREATE INDEX IF NOT EXISTS idx_blood_donor_requests_request_id ON public.blood_donor_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_blood_donor_requests_donor_id ON public.blood_donor_requests(donor_id);
CREATE INDEX IF NOT EXISTS idx_blood_donor_requests_status ON public.blood_donor_requests(status);

-- User Hospital Blood Requests Table
CREATE TABLE IF NOT EXISTS public.user_hospital_blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospital_profiles(id) ON DELETE CASCADE,
  blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  units_required INTEGER NOT NULL DEFAULT 1 CHECK (units_required > 0),
  units_approved INTEGER DEFAULT 0,
  urgency_level TEXT NOT NULL DEFAULT 'normal' CHECK (urgency_level IN ('normal', 'urgent', 'critical')),
  patient_name TEXT,
  patient_age INTEGER,
  patient_condition TEXT,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled')),
  hospital_response TEXT,
  responded_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_hospital_blood_requests_user_id ON public.user_hospital_blood_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hospital_blood_requests_hospital_id ON public.user_hospital_blood_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_user_hospital_blood_requests_blood_group ON public.user_hospital_blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_user_hospital_blood_requests_status ON public.user_hospital_blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_hospital_blood_requests_urgency ON public.user_hospital_blood_requests(urgency_level);
CREATE INDEX IF NOT EXISTS idx_user_hospital_blood_requests_created_at ON public.user_hospital_blood_requests(created_at DESC);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.blood_donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_blood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_donor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hospital_blood_requests ENABLE ROW LEVEL SECURITY;

-- Blood Donors Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_donors' AND policyname = 'Users can view available blood donors') THEN
    CREATE POLICY "Users can view available blood donors"
      ON public.blood_donors FOR SELECT
      USING (is_available = true OR auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_donors' AND policyname = 'Users can insert their own donor profile') THEN
    CREATE POLICY "Users can insert their own donor profile"
      ON public.blood_donors FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_donors' AND policyname = 'Users can update their own donor profile') THEN
    CREATE POLICY "Users can update their own donor profile"
      ON public.blood_donors FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_donors' AND policyname = 'Users can delete their own donor profile') THEN
    CREATE POLICY "Users can delete their own donor profile"
      ON public.blood_donors FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Blood Requests Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_requests' AND policyname = 'Users can view active blood requests') THEN
    CREATE POLICY "Users can view active blood requests"
      ON public.blood_requests FOR SELECT
      USING (status IN ('active', 'partially_fulfilled') OR auth.uid() = requester_id OR 
             (requester_type = 'hospital' AND hospital_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_requests' AND policyname = 'Users can create blood requests') THEN
    CREATE POLICY "Users can create blood requests"
      ON public.blood_requests FOR INSERT
      WITH CHECK (auth.uid() = requester_id OR 
                  (requester_type = 'hospital' AND hospital_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_requests' AND policyname = 'Users can update their own requests') THEN
    CREATE POLICY "Users can update their own requests"
      ON public.blood_requests FOR UPDATE
      USING (auth.uid() = requester_id OR 
             (requester_type = 'hospital' AND hospital_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_requests' AND policyname = 'Users can delete their own requests') THEN
    CREATE POLICY "Users can delete their own requests"
      ON public.blood_requests FOR DELETE
      USING (auth.uid() = requester_id OR 
             (requester_type = 'hospital' AND hospital_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_requests' AND policyname = 'Users can update accepted blood requests') THEN
    CREATE POLICY "Users can update accepted blood requests"
      ON public.blood_requests FOR UPDATE
      USING (accepted_by = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_requests' AND policyname = 'Users can accept active blood requests') THEN
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

-- Blood Donations Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_donations' AND policyname = 'Users can view their donations') THEN
    CREATE POLICY "Users can view their donations"
      ON public.blood_donations FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.blood_donors 
          WHERE blood_donors.id = blood_donations.donor_id 
          AND blood_donors.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.blood_requests 
          WHERE blood_requests.id = blood_donations.request_id 
          AND blood_requests.requester_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_donations' AND policyname = 'Users can insert their donations') THEN
    CREATE POLICY "Users can insert their donations"
      ON public.blood_donations FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.blood_donors 
          WHERE blood_donors.id = blood_donations.donor_id 
          AND blood_donors.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Blood Chat Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_chat' AND policyname = 'Users can view their chat messages') THEN
    CREATE POLICY "Users can view their chat messages"
      ON public.blood_chat FOR SELECT
      USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_chat' AND policyname = 'Users can send chat messages') THEN
    CREATE POLICY "Users can send chat messages"
      ON public.blood_chat FOR INSERT
      WITH CHECK (auth.uid() = sender_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_chat' AND policyname = 'Users can update their messages') THEN
    CREATE POLICY "Users can update their messages"
      ON public.blood_chat FOR UPDATE
      USING (auth.uid() = receiver_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_chat' AND policyname = 'Users can chat about their hospital requests') THEN
    CREATE POLICY "Users can chat about their hospital requests"
      ON public.blood_chat FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_hospital_blood_requests
          WHERE user_hospital_blood_requests.id = blood_chat.hospital_request_id
          AND user_hospital_blood_requests.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_chat' AND policyname = 'Hospitals can chat about their hospital requests') THEN
    CREATE POLICY "Hospitals can chat about their hospital requests"
      ON public.blood_chat FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_hospital_blood_requests
          WHERE user_hospital_blood_requests.id = blood_chat.hospital_request_id
          AND user_hospital_blood_requests.hospital_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_chat' AND policyname = 'Users can send messages for their hospital requests') THEN
    CREATE POLICY "Users can send messages for their hospital requests"
      ON public.blood_chat FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_hospital_blood_requests
          WHERE user_hospital_blood_requests.id = blood_chat.hospital_request_id
          AND user_hospital_blood_requests.user_id = auth.uid()
        )
        AND sender_id = auth.uid()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_chat' AND policyname = 'Hospitals can send messages for their hospital requests') THEN
    CREATE POLICY "Hospitals can send messages for their hospital requests"
      ON public.blood_chat FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_hospital_blood_requests
          WHERE user_hospital_blood_requests.id = blood_chat.hospital_request_id
          AND user_hospital_blood_requests.hospital_id = auth.uid()
        )
        AND sender_id = auth.uid()
      );
  END IF;
END $$;

-- Hospital Blood Inventory Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hospital_blood_inventory' AND policyname = 'Hospitals can view their inventory') THEN
    CREATE POLICY "Hospitals can view their inventory"
      ON public.hospital_blood_inventory FOR SELECT
      USING (hospital_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hospital_blood_inventory' AND policyname = 'Users can view all hospital inventories') THEN
    CREATE POLICY "Users can view all hospital inventories"
      ON public.hospital_blood_inventory FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hospital_blood_inventory' AND policyname = 'Hospitals can manage their inventory') THEN
    CREATE POLICY "Hospitals can manage their inventory"
      ON public.hospital_blood_inventory FOR ALL
      USING (hospital_id = auth.uid());
  END IF;
END $$;

-- Hospital Blood Requests Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hospital_blood_requests' AND policyname = 'Users can view hospital blood requests') THEN
    CREATE POLICY "Users can view hospital blood requests"
      ON public.hospital_blood_requests FOR SELECT
      USING (status IN ('active', 'partially_fulfilled') OR hospital_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hospital_blood_requests' AND policyname = 'Hospitals can manage their requests') THEN
    CREATE POLICY "Hospitals can manage their requests"
      ON public.hospital_blood_requests FOR ALL
      USING (hospital_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hospital_blood_requests' AND policyname = 'Users can view active hospital blood requests') THEN
    CREATE POLICY "Users can view active hospital blood requests"
      ON public.hospital_blood_requests FOR SELECT
      USING (status IN ('active', 'partially_fulfilled'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hospital_blood_requests' AND policyname = 'Users can update accepted hospital requests') THEN
    CREATE POLICY "Users can update accepted hospital requests"
      ON public.hospital_blood_requests FOR UPDATE
      USING (accepted_by = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hospital_blood_requests' AND policyname = 'Users can accept active hospital requests') THEN
    CREATE POLICY "Users can accept active hospital requests"
      ON public.hospital_blood_requests FOR UPDATE
      USING (
        status IN ('active', 'partially_fulfilled') 
        AND accepted_by IS NULL
      )
      WITH CHECK (
        accepted_by = auth.uid()
        AND accepted_at IS NOT NULL
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hospital_blood_requests' AND policyname = 'Hospitals can cancel their own requests') THEN
    CREATE POLICY "Hospitals can cancel their own requests"
      ON public.hospital_blood_requests FOR UPDATE
      USING (
        auth.uid() = hospital_id 
        AND status IN ('active', 'partially_fulfilled')
      )
      WITH CHECK (
        status = 'cancelled'
        AND cancelled_at IS NOT NULL
        AND cancelled_by = auth.uid()
      );
  END IF;
END $$;

-- Blood Donor Requests Link Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_donor_requests' AND policyname = 'Users can view donor-request links') THEN
    CREATE POLICY "Users can view donor-request links"
      ON public.blood_donor_requests FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.blood_requests 
          WHERE blood_requests.id = blood_donor_requests.request_id 
          AND blood_requests.requester_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.blood_donors 
          WHERE blood_donors.id = blood_donor_requests.donor_id 
          AND blood_donors.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_donor_requests' AND policyname = 'Users can create donor-request links') THEN
    CREATE POLICY "Users can create donor-request links"
      ON public.blood_donor_requests FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.blood_donors 
          WHERE blood_donors.id = blood_donor_requests.donor_id 
          AND blood_donors.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_donor_requests' AND policyname = 'Users can update donor-request links') THEN
    CREATE POLICY "Users can update donor-request links"
      ON public.blood_donor_requests FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.blood_requests 
          WHERE blood_requests.id = blood_donor_requests.request_id 
          AND blood_requests.requester_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.blood_donors 
          WHERE blood_donors.id = blood_donor_requests.donor_id 
          AND blood_donors.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- User Hospital Blood Requests Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_hospital_blood_requests' AND policyname = 'Users can view their own hospital requests') THEN
    CREATE POLICY "Users can view their own hospital requests"
      ON public.user_hospital_blood_requests FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_hospital_blood_requests' AND policyname = 'Hospitals can view requests for their hospital') THEN
    CREATE POLICY "Hospitals can view requests for their hospital"
      ON public.user_hospital_blood_requests FOR SELECT
      USING (auth.uid() = hospital_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_hospital_blood_requests' AND policyname = 'Users can insert their own hospital requests') THEN
    CREATE POLICY "Users can insert their own hospital requests"
      ON public.user_hospital_blood_requests FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_hospital_blood_requests' AND policyname = 'Users can update their own pending requests') THEN
    CREATE POLICY "Users can update their own pending requests"
      ON public.user_hospital_blood_requests FOR UPDATE
      USING (auth.uid() = user_id AND status = 'pending');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_hospital_blood_requests' AND policyname = 'Hospitals can update requests for their hospital') THEN
    CREATE POLICY "Hospitals can update requests for their hospital"
      ON public.user_hospital_blood_requests FOR UPDATE
      USING (auth.uid() = hospital_id AND status = 'pending');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_hospital_blood_requests' AND policyname = 'Users can cancel their own requests') THEN
    CREATE POLICY "Users can cancel their own requests"
      ON public.user_hospital_blood_requests FOR UPDATE
      USING (auth.uid() = user_id AND status IN ('pending', 'approved'));
  END IF;
END $$;

-- =====================================================
-- 5. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update updated_at column function
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers to all tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_responder_details_updated_at ON public.responder_details;
CREATE TRIGGER update_responder_details_updated_at
  BEFORE UPDATE ON public.responder_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_hospital_profiles_updated_at ON public.hospital_profiles;
CREATE TRIGGER update_hospital_profiles_updated_at
  BEFORE UPDATE ON public.hospital_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sos_requests_updated_at ON public.sos_requests;
CREATE TRIGGER update_sos_requests_updated_at
  BEFORE UPDATE ON public.sos_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_emergency_alerts_updated_at ON public.emergency_alerts;
CREATE TRIGGER update_emergency_alerts_updated_at
  BEFORE UPDATE ON public.emergency_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_anonymous_reports_updated_at ON public.anonymous_reports;
CREATE TRIGGER update_anonymous_reports_updated_at
  BEFORE UPDATE ON public.anonymous_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_medical_reports_updated_at ON public.medical_reports;
CREATE TRIGGER update_medical_reports_updated_at
  BEFORE UPDATE ON public.medical_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_blood_donors_updated_at ON public.blood_donors;
CREATE TRIGGER update_blood_donors_updated_at
  BEFORE UPDATE ON public.blood_donors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_blood_requests_updated_at ON public.blood_requests;
CREATE TRIGGER update_blood_requests_updated_at
  BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_blood_donations_updated_at ON public.blood_donations;
CREATE TRIGGER update_blood_donations_updated_at
  BEFORE UPDATE ON public.blood_donations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_blood_chat_updated_at ON public.blood_chat;
CREATE TRIGGER update_blood_chat_updated_at
  BEFORE UPDATE ON public.blood_chat
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_hospital_blood_inventory_updated_at ON public.hospital_blood_inventory;
CREATE TRIGGER update_hospital_blood_inventory_updated_at
  BEFORE UPDATE ON public.hospital_blood_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_hospital_blood_requests_updated_at ON public.hospital_blood_requests;
CREATE TRIGGER update_hospital_blood_requests_updated_at
  BEFORE UPDATE ON public.hospital_blood_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_blood_donor_requests_updated_at ON public.blood_donor_requests;
CREATE TRIGGER update_blood_donor_requests_updated_at
  BEFORE UPDATE ON public.blood_donor_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_user_hospital_blood_requests_updated_at ON public.user_hospital_blood_requests;
CREATE TRIGGER trigger_update_user_hospital_blood_requests_updated_at
  BEFORE UPDATE ON public.user_hospital_blood_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update donor availability after donation
CREATE OR REPLACE FUNCTION public.update_donor_availability()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.blood_donors
  SET 
    donation_count = donation_count + NEW.units_donated,
    last_donation_date = NEW.donation_date,
    next_available_date = NEW.donation_date + INTERVAL '90 days',
    updated_at = now()
  WHERE id = NEW.donor_id;
  
  IF NEW.request_id IS NOT NULL THEN
    UPDATE public.blood_requests
    SET 
      units_received = units_received + NEW.units_donated,
      status = CASE 
        WHEN units_received + NEW.units_donated >= units_required THEN 'fulfilled'
        WHEN units_received + NEW.units_donated > 0 THEN 'partially_fulfilled'
        ELSE status
      END,
      fulfilled_at = CASE 
        WHEN units_received + NEW.units_donated >= units_required THEN now()
        ELSE fulfilled_at
      END,
      updated_at = now()
    WHERE id = NEW.request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_blood_donation_insert ON public.blood_donations;
CREATE TRIGGER on_blood_donation_insert
  AFTER INSERT ON public.blood_donations
  FOR EACH ROW EXECUTE FUNCTION public.update_donor_availability();

-- Function to set accepted_at for blood_requests
CREATE OR REPLACE FUNCTION public.set_blood_request_accepted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.accepted_by IS NOT NULL AND OLD.accepted_by IS NULL THEN
    NEW.accepted_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_blood_request_accepted_at ON public.blood_requests;
CREATE TRIGGER trigger_set_blood_request_accepted_at
  BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_blood_request_accepted_at();

-- Function to update blood_request on acceptance
CREATE OR REPLACE FUNCTION public.update_blood_request_on_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.accepted_by IS NOT NULL AND OLD.accepted_by IS NULL THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_blood_request_on_acceptance ON public.blood_requests;
CREATE TRIGGER trigger_update_blood_request_on_acceptance
  AFTER UPDATE ON public.blood_requests
  FOR EACH ROW
  WHEN (NEW.accepted_by IS NOT NULL AND OLD.accepted_by IS NULL)
  EXECUTE FUNCTION public.update_blood_request_on_acceptance();

-- Function to set accepted_at for hospital_blood_requests
CREATE OR REPLACE FUNCTION set_hospital_request_accepted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.accepted_by IS NOT NULL AND OLD.accepted_by IS NULL THEN
    NEW.accepted_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_hospital_request_accepted_at ON public.hospital_blood_requests;
CREATE TRIGGER trigger_set_hospital_request_accepted_at
  BEFORE UPDATE ON public.hospital_blood_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_hospital_request_accepted_at();

-- Function to set cancelled_at for hospital_blood_requests
CREATE OR REPLACE FUNCTION set_hospital_request_cancelled_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at = now();
    NEW.cancelled_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_hospital_request_cancelled_at ON public.hospital_blood_requests;
CREATE TRIGGER trigger_set_hospital_request_cancelled_at
  BEFORE UPDATE ON public.hospital_blood_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_hospital_request_cancelled_at();

-- Function to update hospital_request on acceptance
CREATE OR REPLACE FUNCTION update_hospital_request_on_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_hospital_request_on_acceptance ON public.hospital_blood_requests;
CREATE TRIGGER trigger_update_hospital_request_on_acceptance
  AFTER UPDATE ON public.hospital_blood_requests
  FOR EACH ROW
  WHEN (NEW.accepted_by IS NOT NULL AND OLD.accepted_by IS NULL)
  EXECUTE FUNCTION update_hospital_request_on_acceptance();

-- Function to update hospital response timestamp
CREATE OR REPLACE FUNCTION update_hospital_response_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    NEW.responded_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_hospital_response_timestamp ON public.user_hospital_blood_requests;
CREATE TRIGGER trigger_update_hospital_response_timestamp
  BEFORE UPDATE ON public.user_hospital_blood_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_hospital_response_timestamp();

-- Function to update hospital inventory on approval
CREATE OR REPLACE FUNCTION update_hospital_inventory_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE public.hospital_blood_inventory
    SET 
      units_reserved = units_reserved + NEW.units_approved,
      updated_at = now()
    WHERE 
      hospital_id = NEW.hospital_id 
      AND blood_group = NEW.blood_group
      AND units_available >= (units_reserved + NEW.units_approved);
  END IF;
  
  IF NEW.status = 'fulfilled' AND OLD.status = 'approved' THEN
    UPDATE public.hospital_blood_inventory
    SET 
      units_available = units_available - NEW.units_approved,
      units_reserved = units_reserved - NEW.units_approved,
      updated_at = now()
    WHERE 
      hospital_id = NEW.hospital_id 
      AND blood_group = NEW.blood_group;
      
    NEW.fulfilled_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_hospital_inventory_on_approval ON public.user_hospital_blood_requests;
CREATE TRIGGER trigger_update_hospital_inventory_on_approval
  BEFORE UPDATE ON public.user_hospital_blood_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_hospital_inventory_on_approval();

-- Function to auto-expire old requests
CREATE OR REPLACE FUNCTION public.expire_old_blood_requests()
RETURNS void AS $$
BEGIN
  UPDATE public.blood_requests
  SET status = 'expired'
  WHERE status IN ('active', 'partially_fulfilled')
    AND expiry_date IS NOT NULL
    AND expiry_date < now();
    
  UPDATE public.hospital_blood_requests
  SET status = 'cancelled'
  WHERE status = 'active'
    AND expiry_date IS NOT NULL
    AND expiry_date < now();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. REALTIME SUPPORT
-- =====================================================

-- Enable realtime for relevant tables
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'emergency_alerts' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_alerts;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sos_requests' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_requests;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'anonymous_reports' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.anonymous_reports;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'blood_requests' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_requests;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'blood_chat' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_chat;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'blood_donor_requests' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_donor_requests;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'hospital_blood_requests' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hospital_blood_requests;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'hospital_blood_inventory' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hospital_blood_inventory;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_hospital_blood_requests' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_hospital_blood_requests;
  END IF;
END $$;

