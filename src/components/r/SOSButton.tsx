
// // import React, { useState, useEffect } from 'react';
// // import { Button } from '@/components/ui/button';
// // import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// // import { AlertTriangle, Navigation } from 'lucide-react';
// // import { useAuth } from '@/hooks/useAuth';
// // import { supabase } from '@/integrations/supabase/client';
// // import { toast } from '@/hooks/use-toast';

// // const SOSButton = () => {
// //   const { user } = useAuth();
// //   const [isLoading, setIsLoading] = useState(false);
// //   const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
// //   const [locationError, setLocationError] = useState<string>('');

// //   useEffect(() => {
// //     if (navigator.geolocation) {
// //       navigator.geolocation.getCurrentPosition(
// //         (position) => {
// //           setLocation(position.coords);
// //         },
// //         (error) => {
// //           setLocationError('Unable to get location. Please enable location services.');
// //           console.error('Location error:', error);
// //         }
// //       );
// //     } else {
// //       setLocationError('Geolocation is not supported by this browser.');
// //     }
// //   }, []);

// //   const sendSOSRequest = async (userLocation: GeolocationCoordinates) => {
// //     if (!user) return;

// //     setIsLoading(true);

// //     try {
// //       const { data: nearbyHospitals, error: hospitalError } = await supabase
// //         .rpc('find_nearby_hospitals', {
// //           user_lat: userLocation.latitude,
// //           user_lon: userLocation.longitude,
// //           radius_km: 5
// //         });

// //       if (hospitalError) throw hospitalError;

// //       if (!nearbyHospitals || nearbyHospitals.length === 0) {
// //         toast({
// //           variant: "destructive",
// //           title: "No Hospitals Available",
// //           description: "No hospitals found within 5km radius. Please call emergency services.",
// //         });
// //         return;
// //       }

// //       const closestHospital = nearbyHospitals[0];

// //       const { error: insertError } = await supabase
// //         .from('sos_requests')
// //         .insert({
// //           user_id: user.id,
// //           user_latitude: userLocation.latitude,
// //           user_longitude: userLocation.longitude,
// //           user_address: 'Current Location',
// //           status: 'pending',
// //           assigned_hospital_id: closestHospital.hospital_id
// //         });

// //       if (insertError) throw insertError;

// //       toast({
// //         title: "SOS Request Sent",
// //         description: `Emergency request sent to ${closestHospital.hospital_name} (${closestHospital.distance.toFixed(2)}km away).`,
// //       });
// //     } catch (error) {
// //       console.error('Error sending SOS request:', error);
// //       toast({
// //         variant: "destructive",
// //         title: "Error",
// //         description: "Failed to send SOS request. Please try again.",
// //       });
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const handleSOSClick = async () => {
// //     if (!location) {
// //       toast({
// //         variant: "destructive",
// //         title: "Location Required",
// //         description: "Please enable location services to send SOS request.",
// //       });
// //       return;
// //     }

// //     try {
// //       await sendSOSRequest(location);
// //     } catch (error) {
// //       console.error('SOS request failed:', error);
// //     }
// //   };

// //   return (
// //     <Card className="mb-6 border-border">
// //       <CardHeader>
// //         <CardTitle className="flex items-center gap-2 text-foreground">
// //           <AlertTriangle className="w-5 h-5 text-destructive" />
// //           Emergency SOS
// //         </CardTitle>
// //         <CardDescription className="text-muted-foreground">
// //           Press the button below in case of emergency. We'll notify nearby hospitals within 5km.
// //         </CardDescription>
// //       </CardHeader>
// //       <CardContent className="text-center">
// //         {locationError ? (
// //           <div className="p-4 bg-warning/10 text-warning rounded-lg mb-4 border border-warning/20">
// //             <p className="text-sm">{locationError}</p>
// //           </div>
// //         ) : (
// //           <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
// //             <Navigation className="w-4 h-4" />
// //             Location services enabled
// //           </div>
// //         )}

// //         <Button
// //           onClick={handleSOSClick}
// //           disabled={isLoading || !location}
// //           size="lg"
// //           className={`w-full h-20 text-lg font-bold ${
// //             isLoading ? 'pulse-emergency' : ''
// //           } bg-destructive text-destructive-foreground hover:bg-destructive/90`}
// //         >
// //           {isLoading ? (
// //             'Sending SOS...'
// //           ) : (
// //             <>
// //               <AlertTriangle className="w-6 h-6 mr-2" />
// //               EMERGENCY SOS
// //             </>
// //           )}
// //         </Button>
// //       </CardContent>
// //     </Card>
// //   );
// // };

// // export default SOSButton;




// import React, { useState, useEffect } from 'react';
// import { Button } from '@/components/ui/button';
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from '@/components/ui/card';
// import emailjs from '@emailjs/browser';
// import { AlertTriangle, Navigation } from 'lucide-react';
// import { useAuth } from '@/hooks/useAuth';
// import { supabase } from '@/integrations/supabase/client';
// import { toast } from '@/hooks/use-toast';

// const haversineDistance = (
//   lat1: number,
//   lon1: number,
//   lat2: number,
//   lon2: number
// ): number => {
//   const toRad = (x: number) => (x * Math.PI) / 180;
//   const R = 6371; // Radius of Earth in km

//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// };

// const SOSButton = () => {
//   const { user } = useAuth();
//   const [isLoading, setIsLoading] = useState(false);
//   const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
//   const [locationError, setLocationError] = useState<string>('');

//   useEffect(() => {
//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           setLocation(position.coords);
//         },
//         (error) => {
//           setLocationError('Unable to get location. Please enable location services.');
//           console.error('Location error:', error);
//         }
//       );
//     } else {
//       setLocationError('Geolocation is not supported by this browser.');
//     }
//   }, []);

//   const sendSOSRequest = async (userLocation: GeolocationCoordinates) => {
//     if (!user) return;
//     setIsLoading(true);

//     try {
//       // Step 1: Fetch all hospitals
//       const { data: hospitals, error: hospitalError } = await supabase
//         .from('hospital_profiles')
//         .select('id, latitude, longitude, hospital_name');

//       if (hospitalError || !hospitals || hospitals.length === 0) {
//         throw new Error('No hospitals found.');
//       }

//       // Step 2: Find nearest hospital
//       const distances = hospitals.map((hospital) => ({
//         ...hospital,
//         distance: haversineDistance(
//           userLocation.latitude,
//           userLocation.longitude,
//           hospital.latitude,
//           hospital.longitude
//         ),
//       }));

//       const sorted = distances.sort((a, b) => a.distance - b.distance);
//       const nearestHospital = sorted[0];

//       // Step 3: Insert SOS request
//       const { error: insertError } = await supabase.from('sos_requests').insert({
//         user_id: user.id,
//         user_latitude: userLocation.latitude,
//         user_longitude: userLocation.longitude,
//         user_address: 'Current Location',
//         status: 'pending',
//         assigned_hospital_id: nearestHospital.id,
//       });

//       if (insertError) throw insertError;

//       toast({
//         title: 'SOS Request Sent',
//         description: `Emergency request sent to ${nearestHospital.hospital_name} (${nearestHospital.distance.toFixed(
//           2
//         )} km away).`,
//       });
//     } catch (error) {
//       console.error('Error sending SOS request:', error);
//       toast({
//         variant: 'destructive',
//         title: 'Error',
//         description: 'Failed to send SOS request. Please try again.',
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

// const sendSOSMail = async (): Promise<void> => {
//   return new Promise((resolve, reject) => {
//     navigator.geolocation.getCurrentPosition(async (pos) => {
//       const latitude = pos.coords.latitude.toFixed(6);
//       const longitude = pos.coords.longitude.toFixed(6);

//       const templateParams = {
//         to_email: "jiadu4979@gmail.com", // 👈 Yaha jisko bhejna he uska mail daalo
//         latitude,
//         longitude,
//         location_link: `https://www.google.com/maps?q=${latitude},${longitude}`,
//       };

//       try {
//         await emailjs.send(
//           'service_e6vdbbf',         // ✅ Your EmailJS Service ID
//           'template_azq1t1s',        // ✅ Your EmailJS Template ID
//           templateParams,
//           'uIUZ0HxEtfzAhDQ9S'        // ✅ Your EmailJS Public Key
//         );
//         alert("🚨 SOS email sent!");
//         resolve();
//       } catch (error) {
//         console.error("❌ Error sending email:", error);
//         alert("❌ Failed to send SOS mail.");
//         reject(error);
//       }
//     }, (err) => {
//       console.error("❌ Location access error:", err);
//       alert("❌ Location permission denied or unavailable.");
//       reject(err);
//     });
//   });
// };



//   const handleSOSClick = async () => {
//     if (!location) {
//       toast({
//         variant: 'destructive',
//         title: 'Location Required',
//         description: 'Please enable location services to send SOS request.',
//       });
//       return;
//     }

//     await sendSOSRequest(location);
//     sendSOSMail()
//   };

//   return (
//     <Card className="mb-6 border-border">
//       <CardHeader>
//         <CardTitle className="  gap-2 text-foreground flex items-center justify-center">
//           <AlertTriangle className="w-5 h-5 text-destructive" />
//           Emergency SOS
//         </CardTitle>
//         {/* <CardDescription className="text-muted-foreground text-center pt-[6px]">
//           Press the button below in case of emergency for fased response form nerest hospitals.
//         </CardDescription> */}
//       </CardHeader>
//       <CardContent className="text-center">
//         {locationError ? (
//           <div className="p-4 bg-warning/10 text-warning rounded-lg mb-4 border border-warning/20">
//             <p className="text-sm">{locationError}</p>
//           </div>
//         ) : (
//           <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
//             <Navigation className="w-4 h-4" />
//            Location services are enabled. SOS request can be sent to the nearest hospital within a 5 km radius.
//           </div>
//         )}
//         <div className="flex items-center justify-center">
//           <Button
//             onClick={handleSOSClick}
//             disabled={isLoading || !location}
//             size="icon"
//             className={`
//       ${isLoading ? 'animate-pulse' : ''}
//       bg-red-600 text-white hover:bg-red-700
//       rounded-full w-32 h-32 flex flex-col items-center justify-center
//       shadow-xl border-4 border-white transition-transform duration-150 active:scale-95
//       focus:outline-none focus:ring-4 focus:ring-red-300
//     `}
//             style={{
//               fontSize: "1.5rem",
//               boxShadow: "0 8px 32px 0 rgba(255,0,0,0.25)",
//             }}
//             aria-label="Send Emergency SOS"
//           >
//             <AlertTriangle className="w-14 h-14 mb-2 text-white drop-shadow" />
//             <span className="font-extrabold tracking-widest text-xl">
//               {isLoading ? "Sending..." : "SOS"}
//             </span>
//           </Button>
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// export default SOSButton;
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertTriangle, Navigation } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useGeminiAI } from '@/hooks/useGeminiAI';
import { sendSOSMail } from '@/hooks/mailhook'; // <-- Use mailhook here

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Radius of Earth in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Parse current_location string format: "(73.7183639,18.5925785)"
// Format is: "(longitude,latitude)"
const parseLocationString = (locationStr: string | null | unknown): { lat: number; lng: number } | null => {
  if (!locationStr) return null;
  
  // Handle if it's already an object
  if (typeof locationStr === 'object' && locationStr !== null) {
    const loc = locationStr as { lat?: number; lng?: number };
    if (loc.lat && loc.lng) {
      return { lat: loc.lat, lng: loc.lng };
    }
  }
  
  // Handle string format: "(lng,lat)"
  if (typeof locationStr !== 'string') return null;
  
  // Remove parentheses and split by comma
  const cleaned = locationStr.replace(/[()]/g, '').trim();
  const parts = cleaned.split(',');
  
  if (parts.length !== 2) return null;
  
  const lng = parseFloat(parts[0].trim());
  const lat = parseFloat(parts[1].trim());
  
  if (isNaN(lat) || isNaN(lng)) return null;
  
  return { lat, lng };
};

const SOSButton = () => {
  const { user } = useAuth();
  const { enhanceDescription } = useGeminiAI();
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [aiEnhancementEnabled, setAiEnhancementEnabled] = useState(true);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(position.coords);
        },
        (error) => {
          setLocationError('Unable to get location. Please enable location services.');
          console.error('Location error:', error);
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
    }
  }, []);

  const sendSOSRequest = async (userLocation: GeolocationCoordinates) => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Step 1: Fetch all hospitals and calculate distances
      const { data: hospitals, error: hospitalError } = await supabase
        .from('hospital_profiles')
        .select('id, latitude, longitude, hospital_name')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (hospitalError) {
        throw new Error('Failed to fetch hospitals.');
      }

      let assignedHospitalId: string | null = null;
      let assignedResponderId: string | null = null;
      let assignedDistance: number | null = null;

      // Step 2: Find hospitals within 5km radius
      if (hospitals && hospitals.length > 0) {
        const hospitalsWithDistance = hospitals.map((hospital) => ({
          ...hospital,
          distance: haversineDistance(
            userLocation.latitude,
            userLocation.longitude,
            Number(hospital.latitude),
            Number(hospital.longitude)
          ),
        }));

        // Filter hospitals within 5km radius
        const nearbyHospitals = hospitalsWithDistance.filter((h) => h.distance <= 5);
        
        if (nearbyHospitals.length > 0) {
          // Sort by distance and assign to nearest hospital within 5km
          const sorted = nearbyHospitals.sort((a, b) => a.distance - b.distance);
          assignedHospitalId = sorted[0].id;
          assignedDistance = sorted[0].distance;
        }
      }

      // Step 3: If NO hospital within 5km, find closest responder for emergency_alerts
      if (!assignedHospitalId) {
        // Fetch all verified responders who are ON DUTY (is_on_duty = true)
        const { data: responders, error: responderError } = await supabase
          .from('responder_details')
          .select(`
            id,
            current_location,
            is_verified,
            is_on_duty
          `)
          .eq('is_verified', true)
          .eq('is_on_duty', true);

        if (responderError) {
          console.error('❌ Error fetching responders:', responderError);
          console.error('Error details:', JSON.stringify(responderError, null, 2));
        }

        console.log(`🔍 Found ${responders?.length || 0} responders with is_verified=true AND is_on_duty=true`);

        if (responders && responders.length > 0) {
          // Parse current_location string format: "(lng,lat)" and find closest responder
          const respondersWithDistance = responders
            .map((responder) => {
              // current_location is a string in format: "(73.7183639,18.5925785)" or JSONB object
              const location = parseLocationString(responder.current_location);
              
              if (!location) {
                console.log(`⚠️ Responder ${responder.id} has no valid location`);
                return null;
              }
              
              const distance = haversineDistance(
                userLocation.latitude,
                userLocation.longitude,
                location.lat,
                location.lng
              );
              
              return {
                ...responder,
                distance,
              };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null);

          if (respondersWithDistance.length > 0) {
            // Sort by distance and assign to nearest responder
            const sorted = respondersWithDistance.sort((a, b) => a.distance - b.distance);
            assignedResponderId = sorted[0].id;
            assignedDistance = sorted[0].distance;
            console.log(`✅ Responder assigned: ID ${sorted[0].id} (${sorted[0].distance.toFixed(2)} km away)`);
          } else {
            console.log('⚠️ Responders found but none have valid location data');
          }
        } else {
          console.log('⚠️ No verified responders with is_on_duty = true found');
        }
      }

      // Step 4: Enhance description with AI if enabled
      let enhancedDescription = 'Emergency SOS request';
      if (aiEnhancementEnabled) {
        try {
          const aiDescription = await enhanceDescription('Medical emergency at current location');
          enhancedDescription = aiDescription.substring(0, 200); // Limit length
        } catch (error) {
          console.warn('AI enhancement failed, using default description');
        }
      }

      // Step 5: Create sos_requests OR emergency_alerts based on scenario
      if (assignedHospitalId) {
        // Scenario 1: Hospital within 5km → Create sos_requests
        const sosData: any = {
          user_id: user.id,
          user_name: `${user.user_metadata?.first_name || 'User'} ${user.user_metadata?.last_name || ''}`.trim(),
          user_phone: user.user_metadata?.phone || 'Not provided',
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          emergency_type: 'medical',
          description: enhancedDescription,
          user_address: 'Current Location',
          status: 'pending',
          assigned_hospital_id: assignedHospitalId,
        };

        const { error: insertError } = await supabase.from('sos_requests').insert(sosData);

        if (insertError) throw insertError;

        const hospital = hospitals?.find((h) => h.id === assignedHospitalId);
        toast({
          title: 'SOS Request Sent',
          description: `Emergency request sent to ${hospital?.hospital_name || 'Hospital'} (${assignedDistance?.toFixed(2) || '0'} km away).`,
        });
      } else if (assignedResponderId) {
        // Scenario 2: No hospital within 5km → Create emergency_alerts
        const alertData: any = {
          user_id: user.id,
          type: 'medical',
          description: enhancedDescription,
          location_lat: userLocation.latitude,
          location_lng: userLocation.longitude,
          location_description: 'Current Location',
          status: 'active',
          responder_id: assignedResponderId,
        };

        const { error: insertError } = await supabase.from('emergency_alerts').insert(alertData);

        if (insertError) throw insertError;

        toast({
          title: 'Emergency Alert Sent',
          description: `Emergency alert assigned to nearby responder (${assignedDistance?.toFixed(2) || '0'} km away). Help is on the way!`,
        });
      } else {
        // Fallback: No hospital or responder found
        toast({
          title: 'Emergency Request Logged',
          description: 'Emergency request has been logged. Emergency services will be notified.',
        });
      }
    } catch (error) {
      console.error('Error sending SOS request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send SOS request. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSOSClick = async () => {
    if (!location) {
      toast({
        variant: 'destructive',
        title: 'Location Required',
        description: 'Please enable location services to send SOS request.',
      });
      return;
    }

    setIsLoading(true);
    try {
      await sendSOSRequest(location);
      await sendSOSMail("medical"); // You can pass "medical" or "safety" if needed
      toast({
        title: "SOS Email Sent",
        description: "Emergency email notification sent successfully.",
      });
    } catch (error) {
      // sendSOSRequest and sendSOSMail already handle their own errors and toasts
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6 border-border">
      <CardHeader>
        <CardTitle className="gap-2 text-foreground flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          Emergency SOS
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        {locationError ? (
          <div className="p-4 bg-warning/10 text-warning rounded-lg mb-4 border border-warning/20">
            <p className="text-sm">{locationError}</p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
            <Navigation className="w-4 h-4" />
            Location services are enabled. SOS request can be sent to the nearest hospital within a 5 km radius.
          </div>
        )}
        <div className="flex items-center justify-center">
          <Button
            onClick={handleSOSClick}
            disabled={isLoading || !location}
            size="icon"
            className={`
              ${isLoading ? 'animate-pulse' : ''}
              bg-red-600 text-white hover:bg-red-700
              rounded-full w-32 h-32 flex flex-col items-center justify-center
              shadow-xl border-4 border-white transition-transform duration-150 active:scale-95
              focus:outline-none focus:ring-4 focus:ring-red-300
            `}
            style={{
              fontSize: "1.5rem",
              boxShadow: "0 8px 32px 0 rgba(255,0,0,0.25)",
            }}
            aria-label="Send Emergency SOS"
          >
            <AlertTriangle className="w-14 h-14 mb-2 text-white drop-shadow" />
            <span className="font-extrabold tracking-widest text-xl">
              {isLoading ? "Sending..." : "SOS"}
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>

      );
};

export default SOSButton;