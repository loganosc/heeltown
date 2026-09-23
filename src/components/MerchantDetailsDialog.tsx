import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTime12Hour } from "@/utils/timeUtils";
import { useIsMobile } from "@/hooks/use-mobile";

interface MerchantDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  coverPhoto?: string;
  attributes: string[];
  location?: string;
  hours?: {
    [key: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
}

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayNames = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export const MerchantDetailsDialog = ({
  open,
  onOpenChange,
  name,
  coverPhoto,
  attributes,
  location,
  hours,
}: MerchantDetailsDialogProps) => {
  const isMobile = useIsMobile();

  const detailsBody = (
    <ScrollArea className="max-h-[70dvh] px-4 pb-6 sm:max-h-[65vh] sm:px-0 sm:pb-0 sm:pr-4">
      <div className="space-y-6">
        {/* Cover Photo */}
        {coverPhoto && (
          <div className="w-full h-48 rounded-lg overflow-hidden bg-muted">
            <img
              src={coverPhoto}
              alt={name}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800';
              }}
            />
          </div>
        )}

        {/* Attributes */}
        {attributes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-demi flex items-center gap-2">
              Attributes
            </h3>
            <div className="flex flex-wrap gap-2">
              {attributes.map((attr) => (
                <Badge key={attr} variant="secondary" className="text-sm px-3 py-1">
                  {attr}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        {location && (
          <div className="space-y-3">
            <h3 className="text-lg font-demi flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location
            </h3>
            <p className="text-muted-foreground">{location}</p>
          </div>
        )}

        {/* Hours */}
        {hours && (
          <div className="space-y-3">
            <h3 className="text-lg font-demi flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Hours
            </h3>
            <div className="space-y-2">
              {dayOrder.map((day) => {
                const dayHours = hours[day];
                if (!dayHours) return null;

                return (
                  <div
                    key={day}
                    className="flex justify-between items-center py-2 border-b border-border last:border-0"
                  >
                    <span className="font-medium capitalize">
                      {dayNames[day as keyof typeof dayNames]}
                    </span>
                    <span className="text-muted-foreground">
                      {dayHours.closed
                        ? 'Closed'
                        : `${formatTime12Hour(dayHours.open)} - ${formatTime12Hour(dayHours.close)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!location && !hours && attributes.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No additional details available
          </p>
        )}
      </div>
    </ScrollArea>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        dismissible
        snapPoints={[0.5, 0.8, 0.95]}
        fadeFromIndex={1}
      >
        <DrawerContent className="max-h-[96dvh]">
          <DrawerHeader className="px-4 pb-2 text-left">
            <DrawerTitle className="text-2xl font-bold">{name}</DrawerTitle>
          </DrawerHeader>
          {detailsBody}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl max-h-[85vh] bg-background rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{name}</DialogTitle>
        </DialogHeader>
        {detailsBody}
      </DialogContent>
    </Dialog>
  );
};
