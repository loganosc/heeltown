import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const weekDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const MerchantPortal = () => {
  const navigate = useNavigate();
  const [sessionReady, setSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>("");
  const [isSubmittingSpecial, setIsSubmittingSpecial] = useState(false);
  const [specialForm, setSpecialForm] = useState({
    offerKind: "special",
    description: "",
    scheduleType: "DAILY",
    startTime: "",
    endTime: "",
    days: [] as string[],
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(Boolean(session?.user));
      setSessionReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setHasSession(Boolean(currentSession?.user));
      setSessionReady(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const { data: merchants = [], isLoading, error: merchantsError } = useQuery({
    queryKey: ["merchant-portal-merchants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: sessionReady,
  });

  useEffect(() => {
    if (!selectedMerchantId && merchants.length > 0) {
      const firstMerchant = merchants[0];
      setSelectedMerchantId(firstMerchant.id);
    }
  }, [merchants, selectedMerchantId]);

  useEffect(() => {
    if (merchantsError) {
      toast.error(merchantsError.message || "Unable to load merchants.");
    }
  }, [merchantsError]);

  const handleSubmitSpecial = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedMerchantId) {
      toast.error("Please select a merchant first.");
      return;
    }

    if (specialForm.scheduleType === "WEEKLY" && specialForm.days.length === 0) {
      toast.error("Select at least one day for a weekly schedule.");
      return;
    }

    setIsSubmittingSpecial(true);
    try {
      const days =
        specialForm.scheduleType === "DAILY"
          ? weekDays
          : specialForm.days;

      // Insert into specials or activities based on offer kind
      const schedule = {
        days,
        start_time: specialForm.startTime,
        end_time: specialForm.endTime,
      };

      const tableName = specialForm.offerKind === "activity" ? "activities" : "specials";
      
      const insertData: any = {
        merchant_id: selectedMerchantId,
        name: specialForm.description.trim() || (specialForm.offerKind === "activity" ? "New Activity" : "New Special"),
        description: specialForm.description.trim() || null,
        schedule,
      };

      // Specials require a price field
      if (tableName === "specials") {
        insertData.price = 0;
      }

      const { error } = await supabase.from(tableName).insert(insertData);

      if (error) throw error;

      toast.success("Special added successfully.");
      setSpecialForm({
        offerKind: "special",
        description: "",
        scheduleType: "DAILY",
        startTime: "",
        endTime: "",
        days: [],
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to add special.");
    } finally {
      setIsSubmittingSpecial(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Merchant Portal</h1>
              <p className="text-sm text-muted-foreground">
                Add specials with days and times for your location.
              </p>
            </div>
            <div className="w-full sm:max-w-xs">
              <Label htmlFor="merchant-select" className="text-xs uppercase text-muted-foreground">
                Merchant
              </Label>
              <Select
                value={selectedMerchantId}
                onValueChange={(value) => setSelectedMerchantId(value)}
              >
                <SelectTrigger id="merchant-select" className="mt-2">
                  <SelectValue placeholder={isLoading ? "Loading merchants..." : "Select a merchant"} />
                </SelectTrigger>
                <SelectContent>
                  {merchants.map((merchant) => (
                    <SelectItem key={merchant.id} value={merchant.id}>
                      {merchant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sessionReady && hasSession === false && !isLoading && merchants.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Sign in to load merchant options.
                </p>
              )}
              {sessionReady && !isLoading && hasSession !== false && merchants.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  No merchants found. Check permissions or create a merchant first.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {merchants.length === 0 && !isLoading ? (
          <div className="text-center text-muted-foreground py-16">
            No merchants found. Create one first to manage specials and hours.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Add a Special or Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitSpecial} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="offer-kind">Offer Type</Label>
                    <Select
                      value={specialForm.offerKind}
                      onValueChange={(value) => setSpecialForm({ ...specialForm, offerKind: value })}
                    >
                      <SelectTrigger id="offer-kind">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="special">Special</SelectItem>
                        <SelectItem value="activity">Activity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="special-description">Description</Label>
                    <Textarea
                      id="special-description"
                      value={specialForm.description}
                      onChange={(event) => setSpecialForm({ ...specialForm, description: event.target.value })}
                      placeholder="Describe the special or activity."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Schedule Type</Label>
                    <Select
                      value={specialForm.scheduleType}
                      onValueChange={(value) => setSpecialForm({ ...specialForm, scheduleType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="special-start">Start Time</Label>
                      <Input
                        id="special-start"
                        type="time"
                        value={specialForm.startTime}
                        onChange={(event) => setSpecialForm({ ...specialForm, startTime: event.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="special-end">End Time</Label>
                      <Input
                        id="special-end"
                        type="time"
                        value={specialForm.endTime}
                        onChange={(event) => setSpecialForm({ ...specialForm, endTime: event.target.value })}
                        required
                      />
                    </div>
                  </div>
                  {specialForm.scheduleType === "WEEKLY" && (
                    <div className="space-y-2">
                      <Label>Days of Week</Label>
                      <div className="flex flex-wrap gap-2">
                        {weekDays.map((day) => (
                            <Button
                              key={day}
                              type="button"
                              variant={specialForm.days.includes(day) ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setSpecialForm({
                                  ...specialForm,
                                  days: specialForm.days.includes(day)
                                    ? specialForm.days.filter((value) => value !== day)
                                    : [...specialForm.days, day],
                                });
                              }}
                            >
                              {day.slice(0, 3)}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isSubmittingSpecial}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    {isSubmittingSpecial ? "Adding..." : "Add Special"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantPortal;
