import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Heart } from "lucide-react";

interface SpecialCardProps {
  name: string;
  description?: string;
  price?: number;
  image?: string;
  merchantName: string;
  tags: string[];
  timeInfo: string;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  onCardClick?: () => void;
}

export const SpecialCard = ({
  name,
  description,
  price,
  image,
  merchantName,
  tags,
  timeInfo,
  isFavorite,
  onFavoriteToggle,
  onCardClick,
}: SpecialCardProps) => {
  return (
    <Card
      className="overflow-hidden transition-all hover:shadow-[var(--shadow-card-hover)] active:scale-[0.98] cursor-pointer"
      onClick={onCardClick}
    >
      {image && (
        <div className="h-40 overflow-hidden bg-muted">
          <img
            src={image.startsWith('http') ? image : new URL(image, import.meta.url).href}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              // Fallback to a placeholder if image fails to load
              e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
            }}
          />
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{name}</h3>
            <p className="text-sm text-muted-foreground">{merchantName}</p>
          </div>
          {onFavoriteToggle && (
            <button
              type="button"
              aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
              className={`touch-target rounded-full border border-border p-2 transition ${
                isFavorite ? "text-red-500" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                onFavoriteToggle();
              }}
            >
              <Heart className={isFavorite ? "fill-current" : ""} size={16} />
            </button>
          )}
        </div>
        
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{timeInfo}</span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          {price !== undefined && (
            <span className="text-lg font-bold" style={{ color: 'hsl(var(--price-color))' }}>
              ${price.toFixed(2)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
