import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Copy, MapPin, Users, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import AdminDashboard from "@/components/AdminDashboard";

const Index = () => {
  const [sessionName, setSessionName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createTrackingSession = async () => {
    if (!sessionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session name",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tracking_sessions')
        .insert({
          session_name: sessionName,
          admin_email: adminEmail || null,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data.id);
      toast({
        title: "Session Created",
        description: "Your tracking session has been created successfully!",
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create tracking session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyTrackingLink = () => {
    if (!currentSession) return;
    
    const trackingUrl = `${window.location.origin}/track/${currentSession}`;
    navigator.clipboard.writeText(trackingUrl);
    toast({
      title: "Link Copied",
      description: "Tracking link has been copied to your clipboard",
    });
  };

  const viewDashboard = () => {
    if (!currentSession) return;
    window.open(`${window.location.origin}/dashboard/${currentSession}`, '_blank');
  };

  if (currentSession) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="text-center">
            <h1 className="mb-2 text-3xl font-bold text-foreground">Tracking Session Created</h1>
            <p className="text-muted-foreground">Share the link below to start tracking locations</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Session: {sessionName}
              </CardTitle>
              <CardDescription>
                Session ID: {currentSession}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}/track/${currentSession}`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={copyTrackingLink} variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={viewDashboard} className="flex-1">
                  <Users className="mr-2 h-4 w-4" />
                  View Dashboard
                </Button>
                <Button onClick={() => setCurrentSession(null)} variant="outline">
                  New Session
                </Button>
              </div>
            </CardContent>
          </Card>

          <AdminDashboard sessionId={currentSession} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 className="mb-2 text-3xl font-bold text-foreground">Location Tracker</h1>
            <p className="text-muted-foreground">Share your location when given a tracking link</p>
          </div>
          <Link to="/admin">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Admin
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How to Use Location Tracker</CardTitle>
            <CardDescription>
              Follow these simple steps to share your location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary text-primary-foreground w-6 h-6 flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Receive a tracking link</p>
                  <p className="text-sm text-muted-foreground">You'll get a special link from an event organizer</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary text-primary-foreground w-6 h-6 flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Click the link</p>
                  <p className="text-sm text-muted-foreground">Open the tracking link in your browser</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary text-primary-foreground w-6 h-6 flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Allow location access</p>
                  <p className="text-sm text-muted-foreground">Grant permission when your browser asks</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary text-primary-foreground w-6 h-6 flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <div>
                  <p className="font-medium">Start sharing</p>
                  <p className="text-sm text-muted-foreground">Your location will be shared automatically</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy & Security</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Your location is only shared when you actively participate</li>
              <li>• You can stop sharing at any time</li>
              <li>• Data is automatically deleted after the session expires</li>
              <li>• Only event organizers can see your location</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;