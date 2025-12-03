import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Plus, Trash2, Phone, Mail, User } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface EmergencyContact {
  id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  relationship: string | null;
  priority: number;
}

const EmergencyContacts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    relationship: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchContacts();
  }, [user, navigate]);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("emergency_contacts")
      .select("*")
      .order("priority", { ascending: true });

    if (!error && data) {
      setContacts(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contact_name || !formData.contact_phone) {
      toast.error("Please fill in at least the name and phone number! 📱");
      return;
    }

    try {
      const { error } = await supabase.from("emergency_contacts").insert({
        user_id: user?.id,
        contact_name: formData.contact_name,
        contact_phone: formData.contact_phone,
        contact_email: formData.contact_email || null,
        relationship: formData.relationship || null,
        priority: contacts.length + 1,
      });

      if (error) throw error;

      toast.success("✨ Contact added! They'll be notified in emergencies.");
      setFormData({ contact_name: "", contact_phone: "", contact_email: "", relationship: "" });
      setIsDialogOpen(false);
      fetchContacts();
    } catch (error) {
      toast.error("Oops! Something went wrong. Let's try that again! 😊");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);

      if (error) throw error;

      toast.success("Contact removed successfully!");
      fetchContacts();
    } catch (error) {
      toast.error("Oops! Something went wrong. Let's try that again! 😊");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/10 to-accent-light/10 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Emergency Contacts 🆘
          </h1>
          <p className="text-muted-foreground mt-1">
            Your safety net. These people will be alerted if you need help! 🛡️
          </p>
        </div>

        {/* Info Card */}
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">How Emergency Contacts Work:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Press the SOS button during any ride to alert your contacts</li>
                  <li>• We'll share your real-time location automatically</li>
                  <li>• Your contacts will receive instant notifications</li>
                  <li>• Add up to 5 trusted contacts for maximum safety</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Contact Button */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Add Emergency Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Emergency Contact</DialogTitle>
              <DialogDescription>
                Add someone who should be notified in case of emergency.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Name *</Label>
                <Input
                  id="contact_name"
                  placeholder="e.g., Mom"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Phone Number *</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email (Optional)</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="contact@example.com"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship (Optional)</Label>
                <Input
                  id="relationship"
                  placeholder="e.g., Parent, Friend, Spouse"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                Save Contact
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Contacts List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Emergency Contacts</CardTitle>
            <CardDescription>
              {contacts.length === 0
                ? "No contacts added yet. Add your first safety contact! 💙"
                : `${contacts.length} contact${contacts.length > 1 ? "s" : ""} ready to help you!`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contacts.length > 0 ? (
              <div className="space-y-3">
                {contacts.map((contact, index) => (
                  <Card key={contact.id} className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Priority #{index + 1}
                            </Badge>
                            <h3 className="font-semibold">{contact.contact_name}</h3>
                            {contact.relationship && (
                              <Badge variant="secondary" className="text-xs">
                                {contact.relationship}
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3" />
                              <span>{contact.contact_phone}</span>
                            </div>
                            {contact.contact_email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-3 h-3" />
                                <span>{contact.contact_email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(contact.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <User className="w-16 h-16 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  No emergency contacts yet. Add someone you trust!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmergencyContacts;
