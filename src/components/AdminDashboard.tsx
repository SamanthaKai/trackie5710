import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, Users } from "lucide-react";

interface Location {
  id: string;
  participant_name: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
}

interface AdminDashboardProps {
  sessionId: string;
}

const AdminDashboard = ({ sessionId }: AdminDashboardProps) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeParticipants, setActiveParticipants] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Fetch initial locations
    const fetchLocations = async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching locations:', error);
        return;
      }

      setLocations(data || []);
      
      // Track active participants (those who sent location in last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const active = new Set(
        data
          ?.filter(loc => new Date(loc.timestamp) > fiveMinutesAgo)
          ?.map(loc => loc.participant_name || 'Anonymous')
          ?.filter(Boolean) || []
      );
      setActiveParticipants(active);
    };

    fetchLocations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('location-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'locations',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newLocation = payload.new as Location;
          setLocations(prev => [newLocation, ...prev]);
          
          // Update active participants
          if (newLocation.participant_name) {
            setActiveParticipants(prev => new Set([...prev, newLocation.participant_name]));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Get latest location for each participant
  const getLatestLocations = () => {
    const latestByParticipant = new Map<string, Location>();
    
    locations.forEach(location => {
      const participantKey = location.participant_name || `anonymous-${location.id}`;
      if (!latestByParticipant.has(participantKey)) {
        latestByParticipant.set(participantKey, location);
      }
    });
    
    return Array.from(latestByParticipant.values());
  };

  const latestLocations = getLatestLocations();

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeParticipants.size}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {locations.length > 0 ? getTimeAgo(locations[0].timestamp) : 'No data'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Location Map</CardTitle>
          <CardDescription>
            Latest locations for all participants - click coordinates to view on map
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {latestLocations.length > 0 ? (
              latestLocations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      {location.participant_name || 'Anonymous'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <a
                        href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </a>
                    </div>
                    {location.accuracy && (
                      <div className="text-xs text-muted-foreground">
                        Accuracy: ±{Math.round(location.accuracy)}m
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{formatTime(location.timestamp)}</div>
                    <div>{getTimeAgo(location.timestamp)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No locations received yet. Share the tracking link to start receiving data.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Locations</CardTitle>
          <CardDescription>
            Latest location updates from all participants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {locations.slice(0, 10).map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="font-medium">
                    {location.participant_name || 'Anonymous'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <a
                      href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </a>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>{formatTime(location.timestamp)}</div>
                  <div>{getTimeAgo(location.timestamp)}</div>
                </div>
              </div>
            ))}
            {locations.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No locations received yet. Share the tracking link to start receiving data.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;