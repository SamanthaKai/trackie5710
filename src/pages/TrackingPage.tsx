import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { MapPin, AlertCircle, CheckCircle, User } from "lucide-react";

const TrackingPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [participantName, setParticipantName] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [locationCount, setLocationCount] = useState(0);
  const [watchId, setWatchId] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionId) return;

    // Fetch session data
    const fetchSession = async () => {
      const { data, error } = await supabase
        .from('tracking_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching session:', error);
        toast({
          title: "Session Not Found",
          description: "This tracking session does not exist or has expired.",
          variant: "destructive",
        });
        return;
      }

      setSessionData(data);
    };

    fetchSession();
  }, [sessionId, toast]);

  const requestLocationPermission = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser doesn't support location tracking.",
        variant: "destructive",
      });
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'granted') {
        setHasPermission(true);
        return;
      }

      // Request permission by trying to get location
      navigator.geolocation.getCurrentPosition(
        () => {
          setHasPermission(true);
          toast({
            title: "Permission Granted",
            description: "Location access has been enabled.",
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast({
            title: "Permission Denied",
            description: "Location access is required for tracking.",
            variant: "destructive",
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    } catch (error) {
      console.error('Permission error:', error);
      toast({
        title: "Permission Error",
        description: "Unable to request location permission.",
        variant: "destructive",
      });
    }
  };

  const startTracking = async () => {
    if (!hasPermission || !sessionId) return;

    if (!participantName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name before starting tracking.",
        variant: "destructive",
      });
      return;
    }

    setIsTracking(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 15000, // Reduced timeout for faster response
      maximumAge: 10000 // More frequent updates for better accuracy
    };

    const handleSuccess = async (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;

      try {
        const { error } = await supabase
          .from('locations')
          .insert({
            session_id: sessionId,
            participant_name: participantName,
            latitude,
            longitude,
            accuracy,
            timestamp: new Date().toISOString(),
          });

        if (error) {
          console.error('Error saving location:', error);
          return;
        }

        setLocationCount(prev => prev + 1);
      } catch (error) {
        console.error('Error sending location:', error);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('Geolocation error:', error);
      toast({
        title: "Location Error",
        description: "Unable to get your current location. Please check your settings.",
        variant: "destructive",
      });
    };

    // Start watching position
    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );

    setWatchId(id);

    toast({
      title: "Tracking Started",
      description: "Your location is now being shared.",
    });
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    toast({
      title: "Tracking Stopped",
      description: "Location sharing has been disabled.",
    });
  };

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading session...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold text-foreground">Location Sharing</h1>
          <p className="text-muted-foreground">Join the tracking session</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {sessionData.session_name}
            </CardTitle>
            <CardDescription>
              Share your location to participate in this tracking session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasPermission && (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Location Permission Required</p>
                      <p className="text-xs text-muted-foreground">
                        This app needs access to your location to share it with the session organizer.
                      </p>
                    </div>
                  </div>
                </div>
                <Button onClick={requestLocationPermission} className="w-full">
                  Allow Location Access
                </Button>
              </div>
            )}

            {hasPermission && !isTracking && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-400">
                    Location permission granted
                  </span>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="participantName" className="text-sm font-medium text-foreground">
                    Your Name
                  </label>
                  <Input
                    id="participantName"
                    placeholder="Enter your name"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                  />
                </div>

                <Button onClick={startTracking} className="w-full">
                  <User className="mr-2 h-4 w-4" />
                  Start Sharing Location
                </Button>
              </div>
            )}

            {isTracking && (
              <div className="space-y-4">
                <div className="text-center p-6 border rounded-lg bg-primary/5">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium text-foreground">Location Sharing Active</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your location is being shared with: {participantName}
                  </p>
                  <div className="text-2xl font-bold text-primary">
                    {locationCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Location updates sent
                  </p>
                </div>

                <Button onClick={stopTracking} variant="destructive" className="w-full">
                  Stop Sharing Location
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="mb-2">🔒 Your privacy is protected</p>
              <p>Location data is only shared with the session organizer and automatically deleted after the session ends.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrackingPage;