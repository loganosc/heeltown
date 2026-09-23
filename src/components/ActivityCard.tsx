import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface ActivityCardProps {
  name: string;
  description?: string;
  image?: string;
  merchantName: string;
  tags: string[];
  timeInfo: string;
}

export const ActivityCard = ({
  name,
  description,
  image,
  merchantName,
  tags,
  timeInfo,
}: ActivityCardProps) => {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-[var(--shadow-card-hover)] active:scale-[0.98]">
      {image && (
        <div className="h-40 overflow-hidden bg-muted">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400';
            }}
          />
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">{name}</h3>
          <p className="text-sm text-muted-foreground">{merchantName}</p>
        </div>
        
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{timeInfo}</span>
        </div>

        <div className="flex flex-wrap gap-1 pt-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
