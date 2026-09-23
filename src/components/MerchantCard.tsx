import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

interface MerchantCardProps {
  name: string;
  coverPhoto?: string;
  attributes: string[];
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onClick?: () => void;
}

export const MerchantCard = ({ name, coverPhoto, attributes, isFavorite = false, onToggleFavorite, onClick }: MerchantCardProps) => {
  return (
    <Card 
      className="overflow-hidden transition-all hover:shadow-[var(--shadow-card-hover)] active:scale-[0.98] cursor-pointer"
      onClick={onClick}
    >
      {coverPhoto && (
        <div className="h-48 overflow-hidden bg-muted relative">
          <img
            src={coverPhoto}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';
            }}
          />
          {onToggleFavorite && (
            <Button
              size="icon"
              variant="default"
              className="absolute top-2 right-2 touch-target rounded-full shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
            >
              <Heart
                className={`h-4 w-4 ${isFavorite ? 'fill-white text-white' : ''}`}
              />
            </Button>
          )}
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-lg">{name}</h3>
        
        <div className="flex flex-wrap gap-1">
          {attributes.map((attr) => (
            <Badge key={attr} variant="outline" className="text-xs">
              {attr}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
