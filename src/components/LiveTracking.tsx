import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import {
  MapPin,
  Navigation,
  Shield,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

import { toast } from "sonner";
import { useGeolocation, GeolocationData } from "@/hooks/useGeolocation";
import SOSButton from "./SOSButton";

interface LiveTrackingProps {
  rideId: string;
  userType: "passenger" | "driver";
  originalRoute?: { lat: number; lng: number }[];
}

const LiveTracking: React.FC<LiveTrackingProps> = ({
  rideId,
  userType,
  originalRoute,
}) => {
  const { user } = useAuth();
  const { location, error, isTracking, startTracking } = useGeolocation();

  const [otherUserLocation, setOtherUserLocation] =
    useState<GeolocationData | null>(null);
  const [routeDeviation, setRouteDeviation] = useState(false);

  const lastLocationRef = useRef<GeolocationData | null>(null);
  const deviationShownRef = useRef(false);

  // Start tracking on mount
  useEffect(() => {
    const stop = startTracking();
    return () => {
      if (stop) stop();
    };
  }, [startTracking]);

  // Send my location to Supabase
  useEffect(() => {
    if (!location || !user) return;

    const sendLocation = async () => {
      try {
        await supabase.from("ride_locations").insert({
          ride_id: rideId,
          user_id: user.id,
          user_type: userType,
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          speed: location.speed,
          accuracy: location.accuracy,
          timestamp: new Date(location.timestamp).toISOString(),
        });
        lastLocationRef.current = location;
      } catch (e) {
        console.error("Error sending location:", e);
      }
    };

    sendLocation();
    const intervalId = setInterval(sendLocation, 5000);

    return () => clearInterval(intervalId);
  }, [location, rideId, user, userType]);

  // Subscribe to other user's location
  useEffect(() => {
    if (!rideId) return;

    const channel = supabase
      .channel(`ride_location_${rideId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ride_locations",
          filter: `ride_id=eq.${rideId}`,
        },
        (payload) => {
          const newLocation = payload.new;
          if (newLocation.user_id === user?.id) return;

          setOtherUserLocation({
            lat: Number(newLocation.lat),
            lng: Number(newLocation.lng),
            heading: newLocation.heading ? Number(newLocation.heading) : null,
            speed: newLocation.speed ? Number(newLocation.speed) : null,
            accuracy: Number(newLocation.accuracy),
            timestamp: new Date(newLocation.timestamp).getTime(),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId, user]);

  // Route deviation detection
  useEffect(() => {
    if (!location || !originalRoute || originalRoute.length === 0) return;

    const minDistance = originalRoute.reduce((min, point) => {
      const d = haversine(location.lat, location.lng, point.lat, point.lng);
      return d < min ? d : min;
    }, Infinity);

    // more than 0.5km away from route
    if (minDistance > 0.5) {
      if (!deviationShownRef.current) {
        deviationShownRef.current = true;
        setRouteDeviation(true);
        toast(
          "I noticed we're on a slightly different route than planned. Everything okay? I'm here if you need help. 🛡️"
        );
      }
    } else {
      if (deviationShownRef.current) {
        deviationShownRef.current = false;
        setRouteDeviation(false);
        toast.success("Back on route! All good! ✨");
      }
    }
  }, [location, originalRoute]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Oops! I can't access your location right now. Please enable location
          services to use live tracking. 📍
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-primary" />
          Live Tracking
        </CardTitle>
        <CardDescription>
          I'm keeping an eye on your journey in real-time! 👀✨
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* SOS Button */}
        <div className="w-full">
          <SOSButton rideId={rideId} currentLocation={location} size="lg" />
        </div>

        {/* Tracking Status */}
        <div className="flex items-center justify-between p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="font-medium">
              {isTracking ? "Tracking Active" : "Starting tracking..."}
            </span>
          </div>
          <Badge variant="outline" className="animate-pulse">
            Live
          </Badge>
        </div>

        {/* Route Deviation Alert */}
        {routeDeviation && (
          <Alert className="border-amber-400 bg-amber-50 dark:bg-amber-900/10">
            <Shield className="w-4 h-4 text-amber-500" />
            <AlertDescription className="text-sm">
              <strong>Heads up!</strong> We've taken a different route. I'm
              watching everything closely. Your safety is my priority! 🛡️
            </AlertDescription>
          </Alert>
        )}

        {/* Your Location */}
        {location && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4 text-primary" />
              Your Location
            </div>
            <div className="bg-muted/50 p-3 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Latitude:</span>
                <span className="font-mono">{location.lat.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Longitude:</span>
                <span className="font-mono">{location.lng.toFixed(6)}</span>
              </div>
              {location.accuracy != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accuracy:</span>
                  <span className="font-mono">
                    {location.accuracy.toFixed(0)} m
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Other User Location */}
        {otherUserLocation && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4 text-accent" />
              {userType === "passenger" ? "Driver" : "Passenger"} Location
            </div>
            <div className="bg-muted/50 p-3 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Latitude:</span>
                <span className="font-mono">
                  {otherUserLocation.lat.toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Longitude:</span>
                <span className="font-mono">
                  {otherUserLocation.lng.toFixed(6)}
                </span>
              </div>
              {location && (
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Distance:</span>
                  <span className="font-semibold text-primary">
                    {haversine(
                      location.lat,
                      location.lng,
                      otherUserLocation.lat,
                      otherUserLocation.lng
                    ).toFixed(2)}{" "}
                    km
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
          💡 <strong>Safe travels!</strong> Your location is being shared
          securely with your{" "}
          {userType === "passenger" ? "driver" : "passenger"} only.
        </div>
      </CardContent>
    </Card>
  );
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default LiveTracking;
