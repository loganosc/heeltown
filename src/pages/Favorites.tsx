import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { MerchantCard } from "@/components/MerchantCard";
import { PullToRefreshContainer } from "@/components/PullToRefreshContainer";
import { Loader2, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";

const Favorites = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  useEffect(() => {
    if (session === null) {
      navigate("/auth");
    }
  }, [session, navigate]);

  const { data: favorites, isLoading } = useQuery({
    queryKey: ["favorites", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          *,
          merchants (
            *,
            merchant_attributes_junction (
              attribute:merchant_attributes (
                id,
                name
              )
            )
          )
        `)
        .eq("user_id", session.user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const processedFavorites = useMemo(() => {
    return favorites
      ?.filter((favorite) => favorite.merchants) // Filter out favorites with deleted merchants
      ?.map((favorite) => ({
        ...favorite.merchants,
        attributes: favorite.merchants.merchant_attributes_junction?.map((maj: any) => maj.attribute.name) || [],
        cover_photo: favorite.merchants.cover_photo
          ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/merchant-images/${favorite.merchants.cover_photo}`
          : undefined,
      })) || [];
  }, [favorites]);

  if (!session) {
    return null;
  }

  const handlePullRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["favorites", session.user.id] });
  };

  return (
    <div className="mobile-screen bottom-nav-space bg-background">
      <PullToRefreshContainer onRefresh={handlePullRefresh}>
        <div className="mobile-content py-6">
          <div className="flex items-center gap-3 mb-6">
            <Heart className="w-8 h-8 fill-current" style={{ color: 'hsl(var(--primary))' }} />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'hsl(var(--title-color))' }}>
              Your Favorites
            </h1>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : processedFavorites && processedFavorites.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {processedFavorites.map((merchant: any) => (
                <MerchantCard 
                  key={merchant.id}
                  name={merchant.name}
                  coverPhoto={merchant.cover_photo}
                  attributes={merchant.attributes}
                  isFavorite={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2 text-muted-foreground">No favorites yet</h2>
              <p className="text-muted-foreground">
                Start exploring and tap the heart icon to save your favorites!
              </p>
            </div>
          )}
        </div>
      </PullToRefreshContainer>

      <BottomNav />
    </div>
  );
};

export default Favorites;
