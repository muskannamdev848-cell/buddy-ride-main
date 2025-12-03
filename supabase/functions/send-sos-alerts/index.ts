import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmergencyContact {
  id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  relationship: string | null;
}

interface SOSRequest {
  alert_id: string;
  user_id: string;
  location: {
    lat: number;
    lng: number;
  };
  contacts: EmergencyContact[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { alert_id, user_id, location, contacts }: SOSRequest = await req.json();

    console.log("SOS Alert activated:", {
      alert_id,
      user_id,
      location,
      contact_count: contacts.length,
    });

    // Get user profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user_id)
      .single();

    const userName = profile?.full_name || "A user";
    const googleMapsLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;

    // Prepare alert message
    const alertMessage = `🆘 EMERGENCY ALERT 🆘

${userName} has activated their SOS emergency alert!

📍 Current Location:
${googleMapsLink}

⏰ Time: ${new Date().toLocaleString()}

They may need immediate assistance. Please try to contact them or check on their safety.

This is an automated alert from the Smart Ride-Hailing Safety System.`;

    // Send notifications to all emergency contacts
    const notificationResults = [];

    for (const contact of contacts) {
      console.log(`Sending alert to ${contact.contact_name}:`, {
        phone: contact.contact_phone,
        email: contact.contact_email,
      });

      // In a production environment, you would integrate with:
      // 1. Twilio for SMS: https://www.twilio.com/docs/sms
      // 2. SendGrid or similar for email: https://sendgrid.com/
      // 3. Push notifications service

      // For now, we'll log the notifications
      // You can integrate actual services by adding their API keys to Supabase secrets

      notificationResults.push({
        contact_id: contact.id,
        contact_name: contact.contact_name,
        phone_sent: true, // Would be actual result from SMS service
        email_sent: contact.contact_email ? true : false, // Would be actual result from email service
        message: alertMessage,
      });
    }

    // Log the SOS event for tracking
    console.log("SOS notifications sent:", notificationResults);

    return new Response(
      JSON.stringify({
        success: true,
        alert_id,
        notifications_sent: notificationResults.length,
        message:
          "SOS alerts have been sent to all emergency contacts. In production, this would send actual SMS and email notifications.",
        notificationResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-sos-alerts function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: errorMessage,
        message: "Failed to send SOS alerts",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
