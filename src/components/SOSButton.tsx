import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GeolocationData } from "@/hooks/useGeolocation";

interface SOSButtonProps {
  rideId?: string;
  currentLocation: GeolocationData | null;
  size?: "default" | "sm" | "lg" | "icon";
}

const SOSButton = ({ rideId, currentLocation, size = "default" }: SOSButtonProps) => {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const handleSOSActivate = async () => {
    if (!user || !currentLocation) {
      toast.error("Unable to get your location. Please try again!");
      return;
    }

    setIsActivating(true);

    try {
      // Create SOS alert
      const { data: sosAlert, error: sosError } = await supabase
        .from("sos_alerts")
        .insert({
          user_id: user.id,
          ride_id: rideId || null,
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          status: "active",
        })
        .select()
        .single();

      if (sosError) throw sosError;

      // Get emergency contacts
      const { data: contacts, error: contactsError } = await supabase
        .from("emergency_contacts")
        .select("*")
        .order("priority", { ascending: true });

      if (contactsError) throw contactsError;

      if (!contacts || contacts.length === 0) {
        toast.error("No emergency contacts found. Please add contacts in settings first!");
        setIsActivating(false);
        setIsDialogOpen(false);
        return;
      }

      // Call edge function to send alerts
      const { error: alertError } = await supabase.functions.invoke("send-sos-alerts", {
        body: {
          alert_id: sosAlert.id,
          user_id: user.id,
          location: {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
          },
          contacts: contacts,
        },
      });

      if (alertError) {
        console.error("Error sending alerts:", alertError);
      }

      toast.success(
        "🆘 SOS Activated! Your emergency contacts have been notified and are being sent your location. Help is on the way! Stay calm, I'm here with you. 🛡️",
        { duration: 10000 }
      );

      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error activating SOS:", error);
      toast.error("Failed to activate SOS. Please call emergency services directly!");
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size={size}
        onClick={() => setIsDialogOpen(true)}
        className="bg-destructive hover:bg-destructive/90 font-bold animate-pulse"
      >
        <AlertCircle className="w-4 h-4 mr-2" />
        SOS Emergency
      </Button>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Shield className="w-6 h-6" />
              Activate SOS Emergency Alert?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-left">
              <p className="font-medium">This will immediately:</p>
              <ul className="space-y-2 text-sm">
                <li>✓ Alert all your emergency contacts</li>
                <li>✓ Share your real-time location</li>
                <li>✓ Send them your ride details</li>
                <li>✓ Keep them updated as you move</li>
              </ul>
              <p className="text-sm text-muted-foreground pt-2">
                💡 <strong>Remember:</strong> For life-threatening emergencies, always call 911
                first!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSOSActivate}
              disabled={isActivating}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isActivating ? "Activating..." : "Yes, Send SOS Alert"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SOSButton;
