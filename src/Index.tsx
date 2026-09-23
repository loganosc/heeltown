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
import { formatTime12Hour } from "@/utils/timeUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, LogOut, Settings, ArrowRight, MoreVertical, Store, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useRequireAdmin";

const Index = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useIsAdmin();
  const [user, setUser] = useState<User | null>(null);
  const [selectedSpecialsTags, setSelectedSpecialsTags] = useState<string[]>([]);
  const [selectedActivitiesTags, setSelectedActivitiesTags] = useState<string[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);

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
      toast({ title: "Error", description: "Failed to log out", variant: "destructive" });
    } else {
      navigate("/auth");
    }
  };

  const { data: specialsTags = [] } = useQuery({
    queryKey: ["specials-tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("specials_tags").select("*").order("display_order").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: activitiesTags = [] } = useQuery({
    queryKey: ["activities-tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities_tags").select("*").order("display_order").order("name");
      if (error) throw error;
      return data;
    },
  });

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

  const { data: specialsAndActivities = [], isLoading: specialsLoading } = useQuery({
    queryKey: ["specials-and-activities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("specials_and_activities").select(`
          *,
          merchant:merchants(name, location)
        `);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const activitiesLoading = specialsLoading;

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

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("favorites").select("merchant_id");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: offerFavorites = [] } = useQuery({
    queryKey: ["offer-favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("offer_favorites")
        .select("offer_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    const channel = supabase
      .channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "specials_and_activities" }, () => {
        queryClient.invalidateQueries({ queryKey: ["specials-and-activities"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "merchants" }, () => {
        queryClient.invalidateQueries({ queryKey: ["merchants"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites" }, () => {
        queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "offer_favorites" }, () => {
        queryClient.invalidateQueries({ queryKey: ["offer-favorites", user?.id] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const isAvailableTodayForEntry = (entry: any) => {
    const days = Array.isArray(entry.days) ? entry.days : [];
    if (days.length === 0) return false;
    const now = new Date();
    const dayKey = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][now.getDay()];
    if (!days.includes(dayKey)) return false;
    const currentTime = now.toTimeString().slice(0, 5);
    const startTime = entry.start_time?.slice(0, 5);
    const endTime = entry.end_time?.slice(0, 5);
    if (!startTime || !endTime) return false;
    if (startTime <= endTime) return currentTime >= startTime && currentTime <= endTime;
    return currentTime >= startTime || currentTime <= endTime;
  };

  const getDaysLabel = (days: string[]) => {
    if (days.length === 7) return "Daily";
    return days.map((day) => day.charAt(0) + day.slice(1).toLowerCase()).join(", ");
  };

  const getTimeInfo = (entry: any) => {
    const startTime = entry.start_time?.slice(0, 5);
    const endTime = entry.end_time?.slice(0, 5);
    if (!startTime || !endTime) return "Time not available";
    const days = Array.isArray(entry.days) ? entry.days : [];
    const dayLabel = days.length > 0 ? getDaysLabel(days) : "Available";
    return `${dayLabel} ${formatTime12Hour(startTime)} – ${formatTime12Hour(endTime)}`;
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

  const upcomingByDay = useMemo(() => {
    return rollingWeek.reduce<Record<string, any[]>>((acc, day) => {
      const entries = specialsAndActivities
        .filter((entry) => Array.isArray(entry.days) && entry.days.includes(day.key))
        .filter((entry) => {
          if (day.key !== rollingWeek[0].key) return true;
          const currentTime = new Date().toTimeString().slice(0, 5);
          const endTime = entry.end_time?.slice(0, 5);
          return endTime ? currentTime <= endTime : true;
        })
        .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
        .map((entry) => {
          const description = entry.description?.trim() || "";
          const title = description.length > 40 ? `${description.slice(0, 40)}...` : description || "Event";
          const startTime = entry.start_time?.slice(0, 5);
          const endTime = entry.end_time?.slice(0, 5);
          return {
            ...entry,
            title,
            merchantName: entry.merchant?.name || "Unknown",
            timeLabel:
              startTime && endTime
                ? `${formatTime12Hour(startTime)} – ${formatTime12Hour(endTime)}`
                : "Time TBD",
          };
        });
      acc[day.key] = entries;
      return acc;
    }, {});
  }, [rollingWeek, specialsAndActivities]);

  const filteredSpecials = useMemo(() => {
    return specialsAndActivities
      .filter((entry) => entry.offer_kind === "special")
      .filter((entry) => isAvailableTodayForEntry(entry))
      .map((entry) => {
        const description = entry.description?.trim() || "";
        const title = description.length > 40 ? `${description.slice(0, 40)}...` : description || "Special";
        return {
          ...entry,
          name: title,
          tags: [],
          merchantName: entry.merchant?.name || "Unknown",
          timeInfo: getTimeInfo(entry),
          description: description.length > 40 ? description : undefined,
          fullDescription: description,
        };
      });
  }, [specialsAndActivities]);

  const filteredActivities = useMemo(() => {
    return specialsAndActivities
      .filter((entry) => entry.offer_kind === "activity")
      .filter((entry) => isAvailableTodayForEntry(entry))
      .map((entry) => {
        const description = entry.description?.trim() || "";
        const title = description.length > 40 ? `${description.slice(0, 40)}...` : description || "Activity";
        return {
          ...entry,
          name: title,
          tags: [],
          merchantName: entry.merchant?.name || "Unknown",
          timeInfo: getTimeInfo(entry),
          description: description.length > 40 ? description : undefined,
          fullDescription: description,
        };
      });
  }, [specialsAndActivities]);

  const filteredMerchants = useMemo(() => {
    return merchants
      .filter((merchant) => {
        if (selectedAttributes.length === 0) return true;
        const merchantAttrIds = merchant.merchant_attributes_junction?.map((maj: any) => maj.attribute.id) || [];
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
      const { error } = await supabase.from("favorites").delete().eq("merchant_id", merchantId).eq("user_id", user.id);
      if (error) {
        toast({ title: "Error", description: "Failed to remove favorite", variant: "destructive" });
      } else {
        queryClient.invalidateQueries({ queryKey: ["favorites", user.id] });
      }
    } else {
      const { error } = await supabase.from("favorites").insert({ merchant_id: merchantId, user_id: user.id });
      if (error) {
        toast({ title: "Error", description: "Failed to add favorite", variant: "destructive" });
      } else {
        queryClient.invalidateQueries({ queryKey: ["favorites", user.id] });
      }
    }
  };

  const toggleOfferFavorite = async (offerId: string) => {
    if (!user) {
      toast({ title: "Login required", description: "Please log in to save favorites.", variant: "destructive" });
      return;
    }
    const isFavorited = offerFavorites.some((f) => f.offer_id === offerId);
    if (isFavorited) {
      const { error } = await supabase.from("offer_favorites").delete().eq("offer_id", offerId).eq("user_id", user.id);
      if (error) {
        toast({ title: "Error", description: "Failed to remove favorite", variant: "destructive" });
      } else {
        queryClient.invalidateQueries({ queryKey: ["offer-favorites", user.id] });
      }
    } else {
      const { error } = await supabase.from("offer_favorites").insert({ offer_id: offerId, user_id: user.id });
      if (error) {
        toast({ title: "Error", description: "Failed to add favorite", variant: "destructive" });
      } else {
        queryClient.invalidateQueries({ queryKey: ["offer-favorites", user.id] });
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

  // Get today's day label for the greeting
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long" });

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: "hsl(var(--background))" }}>

      {/* ── TOP NAV ── */}
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: "#13294B" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" style={{ color: "#4B9CD3" }} />
          <span
            className="font-black tracking-widest uppercase text-white"
            style={{ fontSize: "17px", letterSpacing: "0.12em" }}
          >
            Heel Town
          </span>
        </div>

        {/* Nav actions */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/merchant-portal")}
            className="h-7 px-3 rounded-full text-xs font-medium"
            style={{ backgroundColor: "rgba(75,156,211,0.18)", color: "#7ec8f0" }}
          >
            <Store className="w-3 h-3 mr-1" />
            Portal
          </Button>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-7 h-7"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                >
                  <MoreVertical className="w-3.5 h-3.5 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background z-50">
                <DropdownMenuItem onClick={() => setShowAdmin(true)}>
                  <Settings className="w-3.5 h-3.5 mr-2" /> Admin Panel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/merchant-attributes")}>
                  Merchant Attributes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/manage-merchant-images")}>
                  Manage Images
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="rounded-full w-7 h-7"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          >
            <LogOut className="w-3.5 h-3.5 text-white" />
          </Button>
        </div>
      </header>

      {/* ── HERO STRIP ── */}
      <div
        className="px-4 pt-5 pb-6"
        style={{
          background: "linear-gradient(160deg, #13294B 0%, #1a3d6b 60%, #1e4d82 100%)",
        }}
      >
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "#4B9CD3" }}>
          {todayLabel} · Chapel Hill, NC
        </p>
        <h2 className="text-white font-bold leading-tight" style={{ fontSize: "24px" }}>
          What's good today?
        </h2>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
          Local deals &amp; activities near campus
        </p>
      </div>

      {showAdmin && isAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      {/* ── OFFER DETAIL DIALOG ── */}
      {selectedOffer && (
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
      )}

      {/* ── PAGE CONTENT ── */}
      <div className="px-4 pt-6 space-y-8">

        {/* TODAY'S SPECIALS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg" style={{ color: "hsl(var(--title-color, var(--foreground)))" }}>
              Today's Specials
            </h2>
            <Link
              to="/specials"
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: "#4B9CD3" }}
            >
              See All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <FilterChips
            items={specialsTags.map((t) => ({ id: t.name, name: t.name }))}
            selectedIds={selectedSpecialsTags}
            onToggle={toggleSpecialTag}
          />

          {specialsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#4B9CD3" }} />
            </div>
          ) : filteredSpecials.length === 0 ? (
            <div
              className="rounded-2xl py-8 text-center text-sm"
              style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
            >
              No specials running right now — check back later!
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-3 pb-2">
                {filteredSpecials.map((special) => (
                  <div key={special.id} className="flex-shrink-0 w-[270px]">
                    <SpecialCard
                      name={special.name}
                      description={special.description}
                      price={special.price}
                      image={special.image}
                      merchantName={special.merchantName}
                      tags={special.tags}
                      timeInfo={special.timeInfo}
                      isFavorite={offerFavorites.some((fav) => fav.offer_id === special.id)}
                      onFavoriteToggle={() => toggleOfferFavorite(special.id)}
                      onCardClick={() => handleOfferClick(special)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* TODAY'S ACTIVITIES */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg" style={{ color: "hsl(var(--title-color, var(--foreground)))" }}>
              Today's Activities
            </h2>
            <Link
              to="/activities"
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: "#4B9CD3" }}
            >
              See All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <FilterChips
            items={activitiesTags.map((t) => ({ id: t.name, name: t.name }))}
            selectedIds={selectedActivitiesTags}
            onToggle={toggleActivityTag}
          />

          {activitiesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#4B9CD3" }} />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div
              className="rounded-2xl py-8 text-center text-sm"
              style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
            >
              Nothing on today — check the week ahead below!
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-3 pb-2">
                {filteredActivities.map((activity) => (
                  <div key={activity.id} className="flex-shrink-0 w-[270px]">
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

        {/* UPCOMING WEEK */}
        <section className="space-y-3">
          <h2 className="font-bold text-lg" style={{ color: "hsl(var(--title-color, var(--foreground)))" }}>
            Upcoming Week
          </h2>
          <Card className="rounded-2xl border-border/60 overflow-hidden">
            <CardContent className="p-0">
              <Tabs defaultValue={rollingWeek[0]?.key} className="w-full">
                {/* Day selector strip */}
                <div
                  className="overflow-x-auto scrollbar-hide"
                  style={{ borderBottom: "1px solid hsl(var(--border))" }}
                >
                  <TabsList
                    className="flex w-max min-w-full rounded-none h-auto bg-transparent p-0"
                  >
                    {rollingWeek.map((day, i) => (
                      <TabsTrigger
                        key={day.key}
                        value={day.key}
                        className="flex-1 min-w-[44px] flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-none text-xs font-medium
                          data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none
                          data-[state=inactive]:text-muted-foreground"
                        style={{
                          borderBottom: "2px solid transparent",
                        }}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wide">{day.label}</span>
                        {i === 0 && (
                          <span
                            className="w-1 h-1 rounded-full"
                            style={{ backgroundColor: "#4B9CD3" }}
                          />
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* Day content */}
                {rollingWeek.map((day) => (
                  <TabsContent key={day.key} value={day.key} className="m-0 p-3 space-y-2">
                    {upcomingByDay[day.key]?.length ? (
                      upcomingByDay[day.key].map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                          style={{ backgroundColor: "hsl(var(--muted))" }}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{entry.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{entry.merchantName}</p>
                          </div>
                          <span
                            className="flex-shrink-0 text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap"
                            style={{ backgroundColor: "rgba(75,156,211,0.12)", color: "#4B9CD3" }}
                          >
                            {entry.timeLabel}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground py-3 text-center">
                        Nothing scheduled yet.
                      </p>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* EXPLORE FRANKLIN STREET */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg" style={{ color: "hsl(var(--title-color, var(--foreground)))" }}>
              Explore Franklin St.
            </h2>
            <Link
              to="/merchants"
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: "#4B9CD3" }}
            >
              See All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <FilterChips
            items={merchantAttributes}
            selectedIds={selectedAttributes}
            onToggle={toggleAttribute}
          />

          {merchantsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#4B9CD3" }} />
            </div>
          ) : filteredMerchants.length === 0 ? (
            <div
              className="rounded-2xl py-8 text-center text-sm"
              style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
            >
              {selectedAttributes.length > 0
                ? "No merchants match all selected filters."
                : "No merchants available."}
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-3 pb-2">
                {filteredMerchants.map((merchant) => (
                  <div key={merchant.id} className="flex-shrink-0 w-[270px]">
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

      {/* Merchant detail dialog */}
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
