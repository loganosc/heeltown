import { Badge } from "@/components/ui/badge";

interface FilterChipsProps {
  items: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export const FilterChips = ({ items, selectedIds, onToggle }: FilterChipsProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            aria-pressed={isSelected}
            className="touch-target flex-shrink-0"
          >
            <Badge
              variant={isSelected ? "default" : "outline"}
              className="px-4 py-2 text-sm tracking-wide"
            >
              {item.name}
            </Badge>
          </button>
        );
      })}
    </div>
  );
};
