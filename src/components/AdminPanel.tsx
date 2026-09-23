import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PlusCircle, X, Image as ImageIcon } from "lucide-react";
import { ImageUpload } from "./ImageUpload";

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel = ({ onClose }: AdminPanelProps) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [specialForm, setSpecialForm] = useState({
    merchantId: "",
    name: "",
    description: "",
    price: "",
    scheduleType: "DAILY",
    startTime: "",
    endTime: "",
    days: [] as string[],
  });

  const handleSubmitSpecial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let schedule;
      if (specialForm.scheduleType === "DAILY") {
        schedule = {
          type: "DAILY",
          start_time: specialForm.startTime,
          end_time: specialForm.endTime,
        };
      } else {
        schedule = {
          type: "WEEKLY",
          start_time: specialForm.startTime,
          end_time: specialForm.endTime,
          days: specialForm.days,
        };
      }

      const { error } = await supabase.from("specials").insert({
        merchant_id: specialForm.merchantId,
        name: specialForm.name,
        description: specialForm.description,
        price: parseFloat(specialForm.price),
        schedule,
      });

      if (error) throw error;

      toast.success("Special added successfully!");
      queryClient.invalidateQueries({ queryKey: ["specials"] });
      
      setSpecialForm({
        merchantId: "",
        name: "",
        description: "",
        price: "",
        scheduleType: "DAILY",
        startTime: "",
        endTime: "",
        days: [],
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to add special");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch merchants for image upload
  const { data: merchants = [] } = useQuery({
    queryKey: ['admin-merchants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch activities for image upload
  const { data: activities = [] } = useQuery({
    queryKey: ['admin-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*, merchant:merchants(name)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch specials for image upload
  const { data: specialsList = [] } = useQuery({
    queryKey: ['admin-specials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specials')
        .select('*, merchant:merchants(name)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleMerchantImageUpload = async (merchantId: string, imageUrl: string) => {
    const { error } = await supabase
      .from('merchants')
      .update({ cover_photo: imageUrl })
      .eq('id', merchantId);

    if (error) {
      toast.error("Failed to update merchant image");
    } else {
      toast.success("Merchant image updated!");
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
    }
  };

  const handleActivityImageUpload = async (activityId: string, imageUrl: string) => {
    const { error } = await supabase
      .from('activities')
      .update({ image: imageUrl })
      .eq('id', activityId);

    if (error) {
      toast.error("Failed to update activity image");
    } else {
      toast.success("Activity image updated!");
      queryClient.invalidateQueries({ queryKey: ['admin-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    }
  };

  const handleSpecialImageUpload = async (specialId: string, imageUrl: string) => {
    const { error } = await supabase
      .from('specials')
      .update({ image: imageUrl })
      .eq('id', specialId);

    if (error) {
      toast.error("Failed to update special image");
    } else {
      toast.success("Special image updated!");
      queryClient.invalidateQueries({ queryKey: ['admin-specials'] });
      queryClient.invalidateQueries({ queryKey: ['specials'] });
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 sm:p-8">
      <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-background z-10 border-b pb-4">
          <CardTitle className="text-lg md:text-xl">Admin Panel</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs defaultValue="specials" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
              <TabsTrigger value="specials" className="text-xs md:text-sm py-2">Add Special</TabsTrigger>
              <TabsTrigger value="merchant-images" className="text-xs md:text-sm py-2">Merchant Images</TabsTrigger>
              <TabsTrigger value="activity-images" className="text-xs md:text-sm py-2">Activity Images</TabsTrigger>
              <TabsTrigger value="special-images" className="text-xs md:text-sm py-2">Special Images</TabsTrigger>
            </TabsList>

            <TabsContent value="specials" className="space-y-4">
              <form onSubmit={handleSubmitSpecial} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="merchant">Merchant ID</Label>
                  <Input
                    id="merchant"
                    value={specialForm.merchantId}
                    onChange={(e) => setSpecialForm({ ...specialForm, merchantId: e.target.value })}
                    placeholder="Enter merchant UUID"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Check the backend to get merchant IDs
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Special Name</Label>
                  <Input
                    id="name"
                    value={specialForm.name}
                    onChange={(e) => setSpecialForm({ ...specialForm, name: e.target.value })}
                    placeholder="e.g., Happy Hour Special"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={specialForm.description}
                    onChange={(e) => setSpecialForm({ ...specialForm, description: e.target.value })}
                    placeholder="Describe the special..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={specialForm.price}
                    onChange={(e) => setSpecialForm({ ...specialForm, price: e.target.value })}
                    placeholder="9.99"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduleType">Schedule Type</Label>
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
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={specialForm.startTime}
                      onChange={(e) => setSpecialForm({ ...specialForm, startTime: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={specialForm.endTime}
                      onChange={(e) => setSpecialForm({ ...specialForm, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {specialForm.scheduleType === "WEEKLY" && (
                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-2">
                      {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((day) => (
                        <Button
                          key={day}
                          type="button"
                          variant={specialForm.days.includes(day) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSpecialForm({
                              ...specialForm,
                              days: specialForm.days.includes(day)
                                ? specialForm.days.filter((d) => d !== day)
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

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Adding..." : "Add Special"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="merchant-images" className="space-y-4">
              <div className="space-y-4">
                {merchants.map((merchant) => (
                  <Card key={merchant.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{merchant.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ImageUpload
                        bucket="merchant-images"
                        currentImageUrl={merchant.cover_photo}
                        onUploadComplete={(url) => handleMerchantImageUpload(merchant.id, url)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="activity-images" className="space-y-4">
              <div className="space-y-4">
                {activities.map((activity) => (
                  <Card key={activity.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {activity.name}
                        <span className="text-sm text-muted-foreground ml-2">
                          @ {activity.merchant?.name}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ImageUpload
                        bucket="activity-images"
                        currentImageUrl={activity.image}
                        onUploadComplete={(url) => handleActivityImageUpload(activity.id, url)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="special-images" className="space-y-4">
              <div className="space-y-4">
                {specialsList.map((special) => (
                  <Card key={special.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {special.name}
                        <span className="text-sm text-muted-foreground ml-2">
                          @ {special.merchant?.name}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ImageUpload
                        bucket="special-images"
                        currentImageUrl={special.image}
                        onUploadComplete={(url) => handleSpecialImageUpload(special.id, url)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
