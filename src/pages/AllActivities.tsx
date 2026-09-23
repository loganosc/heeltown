import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ActivityCard } from "@/components/ActivityCard";
import { FilterChips } from "@/components/FilterChips";
import { PullToRefreshContainer } from "@/components/PullToRefreshContainer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { isAvailableToday } from "@/utils/timeUtils";

const AllActivities = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: activitiesTags = [] } = useQuery({
    queryKey: ["activities-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities_tags")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["all-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select(`
          *,
          merchants (name),
          activities_tags_junction (
            activities_tags (name)
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredActivities = activities
    ?.filter((activity) => isAvailableToday(activity.schedule as any))
    .filter((activity) => {
      if (selectedIds.length === 0) return true;
      const activityTagIds = activity.activities_tags_junction?.map(
        (junction: any) => junction.activities_tags?.id
      ) || [];
      return selectedIds.every((id) => activityTagIds.includes(id));
    })
    .map((activity) => ({
      ...activity,
      merchantName: activity.merchants?.name || "Unknown",
      tags: activity.activities_tags_junction?.map(
        (junction: any) => junction.activities_tags?.name
      ) || [],
    }));

  const toggleId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePullRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["all-activities"] }),
      queryClient.invalidateQueries({ queryKey: ["activities-tags"] }),
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
          <h1 className="text-2xl font-bold mb-4">All Activities</h1>
          
          <FilterChips
            items={activitiesTags}
            selectedIds={selectedIds}
            onToggle={toggleId}
          />
        </div>
      </div>

      <PullToRefreshContainer onRefresh={handlePullRefresh}>
        <div className="mobile-content mt-6">
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : filteredActivities && filteredActivities.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredActivities.map((activity: any) => (
                <ActivityCard
                  key={activity.id}
                  name={activity.name}
                  description={activity.description}
                  image={activity.image}
                  merchantName={activity.merchantName}
                  tags={activity.tags}
                  timeInfo={`Available ${activity.schedule?.days?.join(", ") || "today"}`}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              No activities available at this time.
            </div>
          )}
        </div>
      </PullToRefreshContainer>
    </div>
  );
};

export default AllActivities;
