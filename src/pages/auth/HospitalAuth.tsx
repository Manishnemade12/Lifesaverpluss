import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Lock, Phone, MapPin, User } from 'lucide-react';

const HospitalAuth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [capacity, setCapacity] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // 1️⃣ Register with Supabase Auth
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          toast({
            title: "Registration Failed",
            description: signUpError.message,
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        const userId = data.user?.id;
        if (!userId) throw new Error("User ID not found after signup");

        // 2️⃣ Insert ONLY into hospital_profiles table (not profiles)
        const { error: hospitalError } = await supabase
          .from('hospital_profiles')
          .insert([{
            id: userId,          // important for RLS
            email,
            hospital_name: hospitalName,
            address,
            phone,
            contact_person: contactPerson,
            latitude: Number(latitude),
            longitude: Number(longitude),
            capacity: capacity ? Number(capacity) : 0,
            is_available: true
          }]);

        if (hospitalError) {
          toast({
            title: "Hospital Profile Creation Failed",
            description: hospitalError.message,
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        toast({
          title: "Registration Successful",
          description: "Please check your email to verify your account."
        });
        setIsSignUp(false);

      } else {
        // Login
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          toast({
            title: "Login Failed",
            description: signInError.message,
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // Wait for auth state to propagate
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: hospital, error } = await supabase
            .from('hospital_profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (hospital) {
            toast({
              title: "Login Successful",
              description: "Welcome to your hospital dashboard."
            });

            // Give auth context time to update, then navigate
            setTimeout(() => {
              navigate('/dashboard/hospital', { replace: true });
            }, 300);
          } else {
            toast({
              title: "Profile Not Found",
              description: "No hospital profile found for this account.",
              variant: "destructive"
            });
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl text-blue-900">
            {isSignUp ? 'Hospital Registration' : 'Hospital Login'}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? 'Register your hospital to join our emergency response network'
              : 'Access your hospital dashboard'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                {/* Hospital name */}
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Hospital Name"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {/* Address */}
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {/* Phone */}
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {/* Contact person */}
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Contact Person"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {/* Latitude & Longitude */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Latitude"
                      type="number"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Longitude"
                      type="number"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                {/* Capacity */}
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Capacity"
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </>
            )}

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Processing...' : (isSignUp ? 'Register Hospital' : 'Login')}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600"
            >
              {isSignUp
                ? 'Already have an account? Login here'
                : 'Need to register your hospital? Sign up here'
              }
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => navigate('/')}
              className="text-gray-600"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HospitalAuth;