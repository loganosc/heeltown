import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MerchantCard } from "@/components/MerchantCard";
import { MerchantDetailsDialog } from "@/components/MerchantDetailsDialog";
import { FilterChips } from "@/components/FilterChips";
import { PullToRefreshContainer } from "@/components/PullToRefreshContainer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const AllMerchants = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id || null);
    });
  }, []);

  const { data: merchantAttributes = [] } = useQuery({
    queryKey: ["merchant-attributes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchant_attributes")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: merchants = [], isLoading } = useQuery({
    queryKey: ["all-merchants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select(`
          *,
          merchant_attributes_junction (
            merchant_attributes (id, name)
          )
        `)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("favorites")
        .select("merchant_id")
        .eq("user_id", userId);
      if (error) throw error;
      return data.map((f) => f.merchant_id);
    },
    enabled: !!userId,
  });

  const filteredMerchants = merchants
    ?.filter((merchant) => {
      if (selectedIds.length === 0) return true;
      const merchantAttrIds = merchant.merchant_attributes_junction?.map(
        (junction: any) => junction.merchant_attributes?.id
      ) || [];
      return selectedIds.every((id) => merchantAttrIds.includes(id));
    })
    .map((merchant) => ({
      ...merchant,
      attributes: merchant.merchant_attributes_junction?.map(
        (junction: any) => junction.merchant_attributes?.name
      ) || [],
      cover_photo: merchant.cover_photo 
        ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/merchant-images/${merchant.cover_photo}`
        : undefined,
    }));

  const toggleId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleFavorite = async (merchantId: string) => {
    if (!userId) {
      toast.error("Please log in to save favorites");
      return;
    }

    const isFavorite = favorites.includes(merchantId);

    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("merchant_id", merchantId);

      if (error) {
        toast.error("Failed to remove favorite");
        return;
      }
      toast.success("Removed from favorites");
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: userId, merchant_id: merchantId });

      if (error) {
        toast.error("Failed to add favorite");
        return;
      }
      toast.success("Added to favorites");
    }

    queryClient.invalidateQueries({ queryKey: ["favorites", userId] });
  };

  const handleCardClick = (merchant: any) => {
    setSelectedMerchant(merchant);
    setDialogOpen(true);
  };

  const handlePullRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["all-merchants"] }),
      queryClient.invalidateQueries({ queryKey: ["merchant-attributes"] }),
      queryClient.invalidateQueries({ queryKey: ["favorites", userId] }),
    ]);
  };

  return (
    <div className="mobile-screen bg-background pb-6">
      <div className="sticky sticky-safe-top z-10 bg-background border-b">
        <div className="mobile-content py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="touch-target mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="mb-4 text-2xl font-bold">All Merchants</h1>
          
          <FilterChips
            items={merchantAttributes}
            selectedIds={selectedIds}
            onToggle={toggleId}
          />
        </div>
      </div>

      <PullToRefreshContainer onRefresh={handlePullRefresh}>
        <div className="mobile-content mt-6">
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : filteredMerchants && filteredMerchants.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMerchants.map((merchant: any) => (
                <MerchantCard
                  key={merchant.id}
                  name={merchant.name}
                  coverPhoto={merchant.cover_photo}
                  attributes={merchant.attributes}
                  isFavorite={favorites.includes(merchant.id)}
                  onToggleFavorite={() => toggleFavorite(merchant.id)}
                  onClick={() => handleCardClick(merchant)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              No merchants found.
            </div>
          )}
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
    </div>
  );
};

export default AllMerchants;
