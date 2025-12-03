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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Navigation,
  MapPin,
  Shield,
  TrendingDown,
  AlertCircle,
  Mic,
  CheckCircle,
} from "lucide-react";

import { toast } from "sonner";
import DriverMap from "@/components/DriverMap";

interface SafetyZone {
  area_name: string;
  safety_score: "High" | "Moderate" | "Low" | string;
}

const PassengerDashboard = () => {
  const { user } = useAuth();

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [activeRideId, setActiveRideId] = useState<string | null>(null);

  const [surgeMultiplier, setSurgeMultiplier] = useState(1.2);
  const [showHybrid, setShowHybrid] = useState(false);
  const [safetyZones, setSafetyZones] = useState<SafetyZone[]>([]);

  // ==== VOICE BOOKING STATE ====
  const [voiceActive, setVoiceActive] = useState(false);
  const [displayVoiceStep, setDisplayVoiceStep] = useState<
    "pickup" | "dropoff" | null
  >(null);

  const recognitionRef = useRef<any>(null);
  const voiceStepRef = useRef<"pickup" | "dropoff" | null>(null);

  // ==== INIT DUMMY SAFETY ZONES & SURGE ====
  useEffect(() => {
    setSafetyZones([
      { area_name: "City Center", safety_score: "High" },
      { area_name: "Old Town", safety_score: "Moderate" },
      { area_name: "Industrial Area", safety_score: "Low" },
    ]);

    const interval = setInterval(() => {
      const newMultiplier = +(1.0 + Math.random() * 1.5).toFixed(1);
      setSurgeMultiplier(newMultiplier);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // ==== VOICE RECOGNITION LOGIC ====
  const initializeVoiceRecognition = () => {
    if (typeof window === "undefined") return false;
    if (recognitionRef.current) return true;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice recognition is not supported in this browser 😢");
      return false;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN"; // can change to "hi-IN" for Hindi
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
        .toLowerCase()
        .trim();

      console.log("Voice transcript:", transcript);

      if (voiceStepRef.current === "pickup") {
        setPickup(transcript);
        voiceStepRef.current = "dropoff";
        setDisplayVoiceStep("dropoff");
        toast.success(
          `✓ Pickup: "${transcript}"\nNow tell me dropoff location!`
        );
        // restart listening for dropoff
        setTimeout(() => {
          try {
            recognition.start();
          } catch {
            console.log("Recognition already started");
          }
        }, 800);
      } else if (voiceStepRef.current === "dropoff") {
        setDropoff(transcript);
        voiceStepRef.current = null;
        setDisplayVoiceStep(null);
        setVoiceActive(false);
        toast.success(
          `✓ Dropoff: "${transcript}"\nReady to book your ride!`
        );
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Voice error:", event.error);
      setVoiceActive(false);
      setDisplayVoiceStep(null);
      toast.error(`Voice error: ${event.error}`);
    };

    recognition.onend = () => {
      // If we are in the middle of step flow, don't treat as stopped by user
      if (voiceStepRef.current) {
        console.log("Recognition ended but step still active, restarting…");
        try {
          recognition.start();
        } catch {
          console.log("Recognition restart blocked");
        }
      } else {
        console.log("Recognition ended");
        setVoiceActive(false);
        setDisplayVoiceStep(null);
      }
    };

    recognitionRef.current = recognition;
    return true;
  };

  const toggleVoice = () => {
    if (!voiceActive) {
      const initialized = initializeVoiceRecognition();
      if (!initialized) return;

      if (!recognitionRef.current) return;

      voiceStepRef.current = "pickup";
      setDisplayVoiceStep("pickup");
      setVoiceActive(true);

      toast.message("🎤 Voice booking started", {
        description: "First, tell me your pickup location.",
      });

      try {
        recognitionRef.current.start();
      } catch {
        console.log("Recognition already started");
      }
    } else {
      // stop recognition
      setVoiceActive(false);
      setDisplayVoiceStep(null);
      voiceStepRef.current = null;

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          console.log("Recognition already stopped");
        }
      }
      toast.message("Voice booking paused ⏸️");
    }
  };

  // ==== BOOK RIDE ====
  const handleBookRide = async () => {
    if (!user) {
      toast.error("Please log in to book a ride.");
      return;
    }

    if (!pickup || !dropoff) {
      toast.error("Please enter pickup and dropoff, or use voice to fill them. 📍");
      return;
    }

    try {
      const basePrice = 15;
      const finalPrice = (basePrice * surgeMultiplier).toFixed(2);

      const { error: insertError } = await supabase.from("rides").insert({
        passenger_id: user.id,
        pickup_location: pickup,
        dropoff_location: dropoff,
        surge_multiplier: surgeMultiplier,
        final_price: parseFloat(finalPrice),
        status: "requested",
      });

      if (insertError) {
        console.error(insertError);
        toast.error("Oops! Something went wrong. Let's try that again! 😊");
        return;
      }

      // Get most recent ride id for this user
      const { data: recentRide, error: selectError } = await supabase
        .from("rides")
        .select("id")
        .eq("passenger_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!selectError && recentRide) {
        setActiveRideId(recentRide.id);
      }

      toast.success("🎉 Ride booked successfully! Your driver is on the way.");
    } catch (err) {
      console.error(err);
      toast.error("Unexpected error while booking ride.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* LEFT SIDE: MAIN BOOKING CARD */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              Plan Your Journey
            </CardTitle>
            <CardDescription>
              I'll get you there safely! 🛡️
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pickup */}
            <div className="space-y-1">
              <Label htmlFor="pickup" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Pickup Location
              </Label>
              <Input
                id="pickup"
                placeholder="Where are you now?"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              />
            </div>

            {/* Dropoff */}
            <div className="space-y-1">
              <Label htmlFor="dropoff" className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" />
                Dropoff Location
              </Label>
              <Input
                id="dropoff"
                placeholder="Where do you want to go?"
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
              />
            </div>

            {/* Voice Booking */}
            <div className="space-y-2">
              <Button
                variant={voiceActive ? "default" : "outline"}
                className="w-full gap-2"
                onClick={toggleVoice}
              >
                <Mic className="w-4 h-4" />
                {voiceActive
                  ? displayVoiceStep === "pickup"
                    ? "Listening: Pickup…"
                    : displayVoiceStep === "dropoff"
                    ? "Listening: Dropoff…"
                    : "Stop Voice Booking"
                  : "🎤 Use Voice Booking"}
              </Button>
              {displayVoiceStep && (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-sm">
                    {displayVoiceStep === "pickup"
                      ? "Tell me your pickup location."
                      : "Now tell me your dropoff location."}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Surge Pricing Alert */}
            {surgeMultiplier > 1.0 && (
              <Alert className="border-warning/50 bg-warning/5">
                <AlertCircle className="w-4 h-4 text-warning" />
                <AlertDescription className="text-sm">
                  It's a busy time right now, so prices are{" "}
                  <strong>{surgeMultiplier}x</strong> higher to get you a ride
                  faster. Here's the complete breakdown so there are no
                  surprises! 💡
                </AlertDescription>
              </Alert>
            )}

            {/* Price Breakdown */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Base Fare</span>
                <span>₹15.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Surge Multiplier</span>
                <Badge
                  variant={surgeMultiplier > 1.5 ? "destructive" : "secondary"}
                >
                  {surgeMultiplier}x
                </Badge>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">
                  ₹{(15 * surgeMultiplier).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Book Button */}
            <Button onClick={handleBookRide} className="w-full" size="lg">
              Book Ride Now
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT SIDE: DRIVER MAP & HYBRID / SAFETY */}
        <div className="space-y-4">
          {/* Driver Map - Show when ride is active */}
          {activeRideId && (
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-primary" />
                  Your Driver is on the Way 🚗
                </CardTitle>
                <CardDescription>
                  Real-time tracking of your driver's location
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DriverMap
                  driverLat={28.6139}
                  driverLng={77.209}
                  passengerLat={28.5355}
                  passengerLng={77.391}
                  pickupLocation={pickup}
                  dropoffLocation={dropoff}
                />
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    🎯 Driver is 5 min away • License: DL-01-XYZ-2024
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hybrid Ride Suggestion */}
          <Card className="border-success/50 bg-success/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <TrendingDown className="w-5 h-5" />
                Save Money with Hybrid Rides! 🤑
              </CardTitle>
              <CardDescription>
                I found a smart way to save you some cash!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                How about a quick auto ride to the metro station? It's easier
                on your wallet and just as fast!
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowHybrid(!showHybrid)}
                >
                  {showHybrid ? "Hide" : "Show"} Hybrid Options
                </Button>
              </div>
              {showHybrid && (
                <div className="bg-background p-3 rounded-lg text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Auto to Metro (5 min)</span>
                    <span>₹3.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Metro Ride (15 min)</span>
                    <span>₹2.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto from Station (5 min)</span>
                    <span>₹3.50</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-semibold text-success">
                    <span>Total Savings</span>
                    <span>Save ₹6.00! 💰</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Safety Zones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Area Safety Information
              </CardTitle>
              <CardDescription>
                Your safety is my top priority! 🛡️
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {safetyZones.map((zone, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <span className="font-medium">{zone.area_name}</span>
                  <Badge
                    variant={
                      zone.safety_score === "High"
                        ? "default"
                        : zone.safety_score === "Moderate"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {zone.safety_score}
                  </Badge>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                💡 Tip: Let a friend know when you're traveling to areas marked
                as "Moderate". Better safe than sorry! 😊
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PassengerDashboard;
