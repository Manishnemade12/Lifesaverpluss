import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const fetchProfile = async () => {
            try {
              // First check if user is a hospital (hospitals don't use profiles table)
              const { data: hospitalData } = await supabase
                .from('hospital_profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

              if (hospitalData) {
                // This is a hospital user - skip profiles table entirely
                if (isMounted) {
                  setProfile({
                    id: session.user.id,
                    user_type: 'hospital',
                    email: session.user.email,
                    hospital_details: hospitalData,
                  });
                  setLoading(false);
                }
                return;
              }

              // Not a hospital, fetch from profiles table
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

              if (profileError || !profileData) {
                if (isMounted) {
                  setProfile(null);
                  setLoading(false);
                }
                return;
              }

              let responderDetails = null;

              // Fetch responder details if user is a responder
              if (profileData?.user_type === 'responder') {
                const { data } = await supabase
                  .from('responder_details')
                  .select('*')
                  .eq('id', session.user.id)
                  .maybeSingle();
                responderDetails = data;
              }

              if (isMounted) {
                setProfile({
                  ...profileData,
                  responder_details: responderDetails,
                });
                setLoading(false);
              }
            } catch (error) {
              console.error('Error fetching profile:', error);
              if (isMounted) {
                setProfile(null);
                setLoading(false);
              }
            }
          };

          fetchProfile();
        } else {
          if (isMounted) {
            setProfile(null);
            setLoading(false);
          }
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) {
          setLoading(false);
        }
      }
    });

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    if (error || !data.user) return { error };

    // Create profile and responder_details for responders
    if (userData.user_type === 'responder') {
      const userId = data.user.id;

      // Insert into profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          user_type: 'responder'
        });

      if (profileError) return { error: profileError };

      // Insert into responder_details
      const { error: responderError } = await supabase
        .from('responder_details')
        .insert({
          id: userId,
          responder_type: userData.responder_type,
          badge_id: userData.badge_id,
          verification_status: 'pending'
        });

      if (responderError) return { error: responderError };
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (!error) {
      toast({
        title: "Welcome back!",
        description: "Successfully logged in."
      });
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setProfile(null);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out."
      });
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};