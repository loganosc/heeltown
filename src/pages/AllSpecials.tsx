import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SpecialCard } from "@/components/SpecialCard";
import { FilterChips } from "@/components/FilterChips";
import { PullToRefreshContainer } from "@/components/PullToRefreshContainer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { isAvailableToday } from "@/utils/timeUtils";

const AllSpecials = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: specialsTags = [] } = useQuery({
    queryKey: ["specials-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specials_tags")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: specials = [], isLoading } = useQuery({
    queryKey: ["all-specials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specials")
        .select(`
          *,
          merchants (name),
          specials_tags_junction (
            specials_tags (name)
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredSpecials = specials
    ?.filter((special) => isAvailableToday(special.schedule as any))
    .filter((special) => {
      if (selectedIds.length === 0) return true;
      const specialTagIds = special.specials_tags_junction?.map(
        (junction: any) => junction.specials_tags?.id
      ) || [];
      return selectedIds.every((id) => specialTagIds.includes(id));
    })
    .map((special) => ({
      ...special,
      merchantName: special.merchants?.name || "Unknown",
      tags: special.specials_tags_junction?.map(
        (junction: any) => junction.specials_tags?.name
      ) || [],
    }));

  const toggleId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePullRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["all-specials"] }),
      queryClient.invalidateQueries({ queryKey: ["specials-tags"] }),
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
          <h1 className="text-2xl font-bold mb-4">All Specials</h1>
          
          <FilterChips
            items={specialsTags}
            selectedIds={selectedIds}
            onToggle={toggleId}
          />
        </div>
      </div>

      <PullToRefreshContainer onRefresh={handlePullRefresh}>
        <div className="mobile-content mt-6">
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : filteredSpecials && filteredSpecials.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSpecials.map((special: any) => (
                <SpecialCard
                  key={special.id}
                  name={special.name}
                  description={special.description}
                  price={special.price}
                  image={special.image}
                  merchantName={special.merchantName}
                  tags={special.tags}
                  timeInfo={`Available ${special.schedule?.days?.join(", ") || "today"}`}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              No specials available at this time.
            </div>
          )}
        </div>
      </PullToRefreshContainer>
    </div>
  );
};

export default AllSpecials;
