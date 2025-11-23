import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, MapPin, Phone, Mail, Droplet, Search, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HospitalInventory {
  hospital_id: string;
  blood_group: string;
  units_available: number;
  units_reserved: number;
}

interface Hospital {
  id: string;
  hospital_name: string;
  address: string;
  phone: string;
  email: string;
  latitude: number;
  longitude: number;
  is_available: boolean;
  inventory: HospitalInventory[];
  total_units: number;
}

const HospitalList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchHospitals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      
      // Fetch all hospitals (show all, not just available ones)
      const { data: hospitalData, error: hospitalError } = await (supabase
        .from('hospital_profiles' as never)
        .select('*')
        .order('hospital_name', { ascending: true }) as unknown as { data: Hospital[] | null; error: { message: string } | null });

      if (hospitalError) {
        console.error('Error fetching hospitals:', hospitalError);
        throw hospitalError;
      }

      console.log('Fetched hospitals:', hospitalData?.length || 0);

      // Fetch inventory for all hospitals
      const { data: inventoryData, error: inventoryError } = await (supabase
        .from('hospital_blood_inventory' as never)
        .select('*') as unknown as { data: HospitalInventory[] | null; error: { message: string } | null });

      if (inventoryError) {
        console.error('Error fetching inventory:', inventoryError);
        throw inventoryError;
      }

      console.log('Fetched inventory items:', inventoryData?.length || 0);

      // Group inventory by hospital
      const inventoryMap = new Map<string, HospitalInventory[]>();
      (inventoryData || []).forEach((item: HospitalInventory) => {
        if (!inventoryMap.has(item.hospital_id)) {
          inventoryMap.set(item.hospital_id, []);
        }
        inventoryMap.get(item.hospital_id)?.push(item);
      });

      // Combine hospitals with their inventory
      const hospitalsWithInventory: Hospital[] = (hospitalData || []).map(hospital => {
        const inventory = inventoryMap.get(hospital.id) || [];
        const total_units = inventory.reduce((sum, inv) => sum + (inv.units_available - inv.units_reserved), 0);
        
        return {
          ...hospital,
          inventory,
          total_units
        };
      });

      // Sort by total units available (descending)
      hospitalsWithInventory.sort((a, b) => b.total_units - a.total_units);
      
      setHospitals(hospitalsWithInventory);
      console.log('Final hospitals with inventory:', hospitalsWithInventory.length);
      
      if (hospitalsWithInventory.length === 0) {
        toast({
          title: 'No Hospitals Found',
          description: 'No hospitals are currently registered in the system.',
          variant: 'default',
        });
      }
    } catch (error: unknown) {
      console.error('Error fetching hospitals:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch hospitals. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredHospitals = hospitals.filter(hospital =>
    hospital.hospital_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hospital.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getBloodGroupCount = (inventory: HospitalInventory[], bloodGroup: string) => {
    const item = inventory.find(inv => inv.blood_group === bloodGroup);
    return item ? item.units_available - item.units_reserved : 0;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-b-2 border-destructive mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading hospitals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search hospitals by name or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Hospitals Grid */}
      {filteredHospitals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No hospitals found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHospitals.map((hospital) => (
            <Card key={hospital.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      {hospital.hospital_name}
                    </CardTitle>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="line-clamp-1">{hospital.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{hospital.phone}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={hospital.total_units > 0 ? 'default' : 'secondary'}>
                    {hospital.total_units} units
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Blood Groups Available */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Available Blood Groups:</p>
                  <div className="flex flex-wrap gap-2">
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => {
                      const count = getBloodGroupCount(hospital.inventory, bg);
                      return count > 0 ? (
                        <Badge key={bg} variant="outline" className="text-xs">
                          <Droplet className="h-3 w-3 mr-1 text-red-600" />
                          {bg}: {count}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  {hospital.inventory.length === 0 && (
                    <p className="text-xs text-muted-foreground">No blood available</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate(`/dashboard/user/bloodconnect/hospitals/${hospital.id}`)}
                    className="flex-1"
                    size="sm"
                  >
                    View Details
                  </Button>
                  <Button
                    onClick={() => navigate(`/dashboard/user/bloodconnect/chat?hospitalId=${hospital.id}&hospitalName=${encodeURIComponent(hospital.hospital_name)}`)}
                    variant="outline"
                    size="sm"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HospitalList;

