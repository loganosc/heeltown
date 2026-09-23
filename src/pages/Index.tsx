import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { FilterChips } from "@/components/FilterChips";
import { SpecialCard } from "@/components/SpecialCard";
import { ActivityCard } from "@/components/ActivityCard";
import { MerchantCard } from "@/components/MerchantCard";
import { MerchantDetailsDialog } from "@/components/MerchantDetailsDialog";
import { AdminPanel } from "@/components/AdminPanel";
import { BottomNav } from "@/components/BottomNav";
import { PullToRefreshContainer } from "@/components/PullToRefreshContainer";
import { formatTime12Hour } from "@/utils/timeUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, LogOut, Settings, ArrowRight, MoreVertical, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useRequireAdmin";
import { useIsMobile } from "@/hooks/use-mobile";

// Type for schedule JSON
interface Schedule {
  days?: string[];
  start_time?: string;
  end_time?: string;
}

const Index = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useIsAdmin();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<User | null>(null);
  const [selectedSpecialsTags, setSelectedSpecialsTags] = useState<string[]>([]);
  const [selectedActivitiesTags, setSelectedActivitiesTags] = useState<string[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);

  // Check authentication
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      navigate("/auth");
    }
  };

  // Fetch specials tags
  const { data: specialsTags = [] } = useQuery({
    queryKey: ["specials-tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("specials_tags").select("*").order("display_order").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch activities tags
  const { data: activitiesTags = [] } = useQuery({
    queryKey: ["activities-tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities_tags").select("*").order("display_order").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch merchant attributes
  const { data: merchantAttributes = [] } = useQuery({
    queryKey: ["merchant-attributes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchant_attributes")
        .select("*")
        .order("display_order")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch specials with merchant info
  const { data: specials = [], isLoading: specialsLoading } = useQuery({
    queryKey: ["specials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("specials").select(`
          *,
          merchant:merchants(name, location)
        `);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  // Fetch activities with merchant info
  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select(`
          *,
          merchant:merchants(name, location)
        `);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  // Fetch merchants with attributes
  const { data: merchants = [], isLoading: merchantsLoading } = useQuery({
    queryKey: ["merchants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("merchants").select(`
          *,
          merchant_attributes_junction(
            attribute:merchant_attributes(id, name)
          )
        `);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  // Fetch user's favorites (for merchants)
  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("favorites")
        .select("merchant_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Enable realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "specials" }, () => {
        queryClient.invalidateQueries({ queryKey: ["specials"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () => {
        queryClient.invalidateQueries({ queryKey: ["activities"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "merchants" }, () => {
        queryClient.invalidateQueries({ queryKey: ["merchants"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites" }, () => {
        queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  // Helper to parse schedule JSON
  const parseSchedule = (schedule: unknown): Schedule => {
    if (typeof schedule === 'object' && schedule !== null) {
      return schedule as Schedule;
    }
    return {};
  };

  const isAvailableTodayForEntry = (schedule: unknown) => {
    const parsed = parseSchedule(schedule);
    const days = Array.isArray(parsed.days) ? parsed.days : [];
    if (days.length === 0) return false;

    const now = new Date();
    const dayKey = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][now.getDay()];
    if (!days.includes(dayKey)) return false;

    const currentTime = now.toTimeString().slice(0, 5);
    const startTime = parsed.start_time?.slice(0, 5);
    const endTime = parsed.end_time?.slice(0, 5);
    if (!startTime || !endTime) return false;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    }

    // Overnight window (e.g. 22:00 - 02:00)
    return currentTime >= startTime || currentTime <= endTime;
  };

  const getDaysLabel = (days: string[]) => {
    if (days.length === 7) return "Daily";
    return days
      .map((day) => day.charAt(0) + day.slice(1).toLowerCase())
      .join(", ");
  };

  const getTimeInfo = (schedule: unknown) => {
    const parsed = parseSchedule(schedule);
    const startTime = parsed.start_time?.slice(0, 5);
    const endTime = parsed.end_time?.slice(0, 5);
    if (!startTime || !endTime) return "Time not available";
    const days = Array.isArray(parsed.days) ? parsed.days : [];
    const dayLabel = days.length > 0 ? getDaysLabel(days) : "Available";
    return `${dayLabel} ${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
  };

  const rollingWeek = useMemo(() => {
    const today = new Date();
    const dayKeys = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    return Array.from({ length: 7 }).map((_, index) => {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + index);
      const dayKey = dayKeys[nextDate.getDay()];
      const shortLabel = dayKey.slice(0, 3).toLowerCase();
      return {
        date: nextDate,
        key: dayKey,
        label: shortLabel.charAt(0).toUpperCase() + shortLabel.slice(1),
      };
    });
  }, []);

  // Combine specials and activities for upcoming week view
  const combinedOffers = useMemo(() => {
    const specialsWithKind = specials.map((s) => ({
      ...s,
      offer_kind: 'special' as const,
      schedule: parseSchedule(s.schedule),
    }));
    const activitiesWithKind = activities.map((a) => ({
      ...a,
      offer_kind: 'activity' as const,
      schedule: parseSchedule(a.schedule),
    }));
    return [...specialsWithKind, ...activitiesWithKind];
  }, [specials, activities]);

  const upcomingByDay = useMemo(() => {
    return rollingWeek.reduce<Record<string, any[]>>((acc, day) => {
      const entries = combinedOffers
        .filter((entry) => {
          const days = Array.isArray(entry.schedule.days) ? entry.schedule.days : [];
          return days.includes(day.key);
        })
        .filter((entry) => {
          if (day.key !== rollingWeek[0].key) return true;
          const currentTime = new Date().toTimeString().slice(0, 5);
          const endTime = entry.schedule.end_time?.slice(0, 5);
          return endTime ? currentTime <= endTime : true;
        })
        .sort((a, b) => (a.schedule.start_time || "").localeCompare(b.schedule.start_time || ""))
        .map((entry) => {
          const description = entry.description?.trim() || "";
          const title = entry.name || (description.length > 40 ? `${description.slice(0, 40)}...` : description || "Event");
          const startTime = entry.schedule.start_time?.slice(0, 5);
          const endTime = entry.schedule.end_time?.slice(0, 5);
          return {
            ...entry,
            title,
            merchantName: entry.merchant?.name || "Unknown",
            timeLabel:
              startTime && endTime
                ? `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`
                : "Time TBD",
          };
        });
      acc[day.key] = entries;
      return acc;
    }, {});
  }, [rollingWeek, combinedOffers]);

  // Filter and process specials
  const filteredSpecials = useMemo(() => {
    return specials
      .filter((entry) => isAvailableTodayForEntry(entry.schedule))
      .map((entry) => {
        const description = entry.description?.trim() || "";
        const title = entry.name || (description.length > 40 ? `${description.slice(0, 40)}...` : description || "Special");
        return {
          ...entry,
          name: title,
          tags: [],
          merchantName: entry.merchant?.name || "Unknown",
          timeInfo: getTimeInfo(entry.schedule),
          description: description.length > 40 ? description : undefined,
          fullDescription: description,
        };
      });
  }, [specials]);

  // Filter and process activities
  const filteredActivities = useMemo(() => {
    return activities
      .filter((entry) => isAvailableTodayForEntry(entry.schedule))
      .map((entry) => {
        const description = entry.description?.trim() || "";
        const title = entry.name || (description.length > 40 ? `${description.slice(0, 40)}...` : description || "Activity");
        return {
          ...entry,
          name: title,
          tags: [],
          merchantName: entry.merchant?.name || "Unknown",
          timeInfo: getTimeInfo(entry.schedule),
          description: description.length > 40 ? description : undefined,
          fullDescription: description,
        };
      });
  }, [activities]);

  // Filter merchants by attributes (AND logic)
  const filteredMerchants = useMemo(() => {
    return merchants
      .filter((merchant) => {
        if (selectedAttributes.length === 0) return true;

        const merchantAttrIds = merchant.merchant_attributes_junction?.map((maj: any) => maj.attribute.id) || [];

        // Check if merchant has ALL selected attributes
        return selectedAttributes.every((attrId) => merchantAttrIds.includes(attrId));
      })
      .map((merchant) => ({
        ...merchant,
        attributes: merchant.merchant_attributes_junction?.map((maj: any) => maj.attribute.name) || [],
        cover_photo: merchant.cover_photo
          ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/merchant-images/${merchant.cover_photo}`
          : undefined,
      }));
  }, [merchants, selectedAttributes]);

  const toggleSpecialTag = (name: string) => {
    setSelectedSpecialsTags((prev) => (prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]));
  };

  const toggleActivityTag = (name: string) => {
    setSelectedActivitiesTags((prev) => (prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]));
  };

  const toggleAttribute = (id: string) => {
    setSelectedAttributes((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const toggleFavorite = async (merchantId: string) => {
    if (!user) return;

    const isFavorited = favorites.some((f) => f.merchant_id === merchantId);

    if (isFavorited) {
      // Remove favorite
      const { error } = await supabase.from("favorites").delete().eq("merchant_id", merchantId).eq("user_id", user.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to remove favorite",
          variant: "destructive",
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["favorites", user.id] });
        toast({
          title: "Removed",
          description: "Merchant removed from favorites",
        });
      }
    } else {
      // Add favorite
      const { error } = await supabase.from("favorites").insert({ merchant_id: merchantId, user_id: user.id });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add favorite",
          variant: "destructive",
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["favorites", user.id] });
        toast({
          title: "Added",
          description: "Merchant added to favorites",
        });
      }
    }
  };

  const handleOfferClick = (offer: any) => {
    setSelectedOffer(offer);
    setOfferDialogOpen(true);
  };

  const handleMerchantClick = (merchant: any) => {
    setSelectedMerchant(merchant);
    setDialogOpen(true);
  };

  const handlePullRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["specials-and-activities"] }),
      queryClient.invalidateQueries({ queryKey: ["merchants"] }),
      queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["offer-favorites", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["specials-tags"] }),
      queryClient.invalidateQueries({ queryKey: ["activities-tags"] }),
      queryClient.invalidateQueries({ queryKey: ["merchant-attributes"] }),
    ]);
  };

  return (
    <div className="mobile-screen bottom-nav-space bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Hero Header */}
      <div className="sticky sticky-safe-top z-20 text-primary-foreground px-4 py-3 shadow-lg" style={{ backgroundColor: '#4B9AD1' }}>
        <div className="mobile-content flex items-center justify-between px-0">
          <h1 className="text-xl font-black text-white uppercase tracking-wider sm:text-2xl">Heel Town</h1>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/merchant-portal")}
              className="touch-target rounded-full h-11 px-3 bg-white/90 hover:bg-white text-primary"
            >
              <Store className="w-3.5 h-3.5 mr-1" />
              Portal
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAdmin(true)}
                className="touch-target rounded-full bg-white/90 hover:bg-white"
              >
                <Settings className="w-3.5 h-3.5 text-primary" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="touch-target rounded-full bg-white/90 hover:bg-white"
            >
              <LogOut className="w-3.5 h-3.5 text-primary" />
            </Button>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="touch-target rounded-full bg-white/90 hover:bg-white"
                  >
                    <MoreVertical className="w-3.5 h-3.5 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background z-50">
                  <DropdownMenuItem onClick={() => navigate("/admin/merchant-attributes")}>
                    Merchant Attributes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/manage-merchant-images")}>
                    Manage Images
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {showAdmin && isAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {selectedOffer && (
        isMobile ? (
          <Drawer
            open={offerDialogOpen}
            onOpenChange={setOfferDialogOpen}
            dismissible
            snapPoints={[0.4, 0.72, 0.95]}
            fadeFromIndex={1}
          >
            <DrawerContent className="max-h-[96dvh]">
              <DrawerHeader className="text-left">
                <DrawerTitle>{selectedOffer.name}</DrawerTitle>
              </DrawerHeader>
              <div className="space-y-3 px-4 pb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Merchant</p>
                  <p className="font-medium">{selectedOffer.merchantName}</p>
                  {selectedOffer.merchant?.location && (
                    <p className="text-sm text-muted-foreground">{selectedOffer.merchant.location}</p>
                  )}
                </div>
                {(selectedOffer.fullDescription || selectedOffer.description) && (
                  <div>
                    <p className="text-sm text-muted-foreground">Details</p>
                    <p className="text-sm">{selectedOffer.fullDescription || selectedOffer.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="text-sm">{selectedOffer.timeInfo}</p>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{selectedOffer.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Merchant</p>
                  <p className="font-medium">{selectedOffer.merchantName}</p>
                  {selectedOffer.merchant?.location && (
                    <p className="text-sm text-muted-foreground">{selectedOffer.merchant.location}</p>
                  )}
                </div>
                {(selectedOffer.fullDescription || selectedOffer.description) && (
                  <div>
                    <p className="text-sm text-muted-foreground">Details</p>
                    <p className="text-sm">{selectedOffer.fullDescription || selectedOffer.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="text-sm">{selectedOffer.timeInfo}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      )}

      <PullToRefreshContainer onRefresh={handlePullRefresh}>
        <div className="mobile-content py-6 space-y-8">
        {/* Specials Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold sm:text-2xl" style={{ color: 'hsl(var(--title-color))' }}>Today's Specials</h2>
            <Link to="/specials" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              See All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <FilterChips
            items={specialsTags.map((t) => ({ id: t.name, name: t.name }))}
            selectedIds={selectedSpecialsTags}
            onToggle={toggleSpecialTag}
          />

          {specialsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredSpecials.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No specials available right now</p>
          ) : (
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-4 pb-4">
                {filteredSpecials.map((special) => (
                  <div key={special.id} className="flex-shrink-0 w-[85vw] max-w-[320px]">
                    <SpecialCard
                      name={special.name}
                      description={special.description}
                      price={special.price}
                      image={special.image}
                      merchantName={special.merchantName}
                      tags={special.tags}
                      timeInfo={special.timeInfo}
                      onCardClick={() => handleOfferClick(special)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Activities Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold sm:text-2xl" style={{ color: 'hsl(var(--title-color))' }}>Today's Activities</h2>
            <Link to="/activities" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              See All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <FilterChips
            items={activitiesTags.map((t) => ({ id: t.name, name: t.name }))}
            selectedIds={selectedActivitiesTags}
            onToggle={toggleActivityTag}
          />

          {activitiesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No activities available right now</p>
          ) : (
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-4 pb-4">
                {filteredActivities.map((activity) => (
                  <div key={activity.id} className="flex-shrink-0 w-[85vw] max-w-[320px]">
                    <ActivityCard
                      name={activity.name}
                      description={activity.description}
                      image={activity.image}
                      merchantName={activity.merchantName}
                      tags={activity.tags}
                      timeInfo={activity.timeInfo}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Upcoming Week Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold sm:text-2xl" style={{ color: 'hsl(var(--title-color))' }}>Upcoming Week</h2>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">7-Day Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={rollingWeek[0]?.key} className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  {rollingWeek.map((day) => (
                    <TabsTrigger key={day.key} value={day.key} className="text-xs">
                      {day.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {rollingWeek.map((day) => (
                  <TabsContent key={day.key} value={day.key} className="mt-4 space-y-3">
                    {upcomingByDay[day.key]?.length ? (
                      upcomingByDay[day.key].map((entry) => (
                        <div
                          key={entry.id}
                          className="flex flex-col gap-1 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-medium">{entry.title}</p>
                            <p className="text-sm text-muted-foreground">{entry.merchantName}</p>
                          </div>
                          <div className="text-sm text-muted-foreground">{entry.timeLabel}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No events scheduled.</p>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* Merchants Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold sm:text-2xl" style={{ color: 'hsl(var(--title-color))' }}>Explore Franklin Street</h2>
            <Link to="/merchants" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              See All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <FilterChips items={merchantAttributes} selectedIds={selectedAttributes} onToggle={toggleAttribute} />

          {merchantsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredMerchants.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              {selectedAttributes.length > 0 ? "No merchants match all selected attributes" : "No merchants available"}
            </p>
          ) : (
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-4 pb-4">
                {filteredMerchants.map((merchant) => (
                  <div key={merchant.id} className="flex-shrink-0 w-[85vw] max-w-[320px]">
                    <MerchantCard
                      name={merchant.name}
                      coverPhoto={merchant.cover_photo}
                      attributes={merchant.attributes}
                      isFavorite={favorites.some((f) => f.merchant_id === merchant.id)}
                      onToggleFavorite={() => toggleFavorite(merchant.id)}
                      onClick={() => handleMerchantClick(merchant)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        </div>
      </PullToRefreshContainer>

      {selectedMerchant && (
        <MerchantDetailsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          name={selectedMerchant.name}
          coverPhoto={selectedMerchant.cover_photo}
          attributes={selectedMerchant.attributes}
          location={selectedMerchant.location}
          hours={selectedMerchant.hours}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Index;
