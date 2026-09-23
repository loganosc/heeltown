import { Home, MapPin, Heart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: MapPin, label: "Map", path: "/map" },
    { icon: Heart, label: "Favorites", path: "/favorites" },
  ];

  return (
    <div className="fixed left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4" style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="bg-card/95 backdrop-blur border border-border rounded-full shadow-lg px-3 py-2.5 flex items-center justify-between gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`touch-target flex flex-1 items-center justify-center rounded-full transition-all ${
                isActive
                  ? "text-primary bg-primary/10 scale-105"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={item.label}
            >
              <Icon size={20} className={isActive ? "fill-current" : ""} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
