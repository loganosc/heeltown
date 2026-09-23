import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const APPLE_MAPS_TOKEN =
  import.meta.env.VITE_APPLE_MAPS_TOKEN ||
  "eyJraWQiOiI3WE40NTVOTTYyIiwidHlwIjoiSldUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJQM0I5SllaNDZKIiwiaWF0IjoxNzY4MTY0ODQxLCJleHAiOjE3Njg4MDk1OTl9.u0oCD5sVu-nP-yPaAo6Wl2Dxw4QI_7gzlciDMgdXeqbk4Grx0I-kq_MI0eUTKuwyF3weZzi_0W72IzfHwdHkMA"; //TEST TOKEN FROM MAPS, THIS SHOULD BE ENCODED TBH

type Merchant = {
  latitude: number | string;
  longitude: number | string;
  name: string;
  location?: string | null;
  attributes: string[];
  cover_photo?: string;
  [key: string]: unknown;
};

type MapKitSelectEvent = {
  annotation?: mapkit.Annotation & { data?: Merchant };
};

const BRAND_BLUE = "#4D98CF";
const PIN_ICON_SIZE = 28;
const PIN_SELECTED_SIZE = 30;

const makePinIconDataUrl = () => {
  const svg = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9C5 14.06 12 22 12 22C12 22 19 14.06 19 9C19 5.13 15.87 2 12 2Z" fill="${BRAND_BLUE}"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const PIN_ICON_DATA_URL = makePinIconDataUrl();

const createGlyphImage = (mapkit: typeof window.mapkit, size: number) => {
  const imageDescriptor = { url: PIN_ICON_DATA_URL, size: { width: size, height: size } };
  return typeof mapkit.Image === "function" ? new mapkit.Image(imageDescriptor) : (imageDescriptor as mapkit.Image);
};

const createPinAnnotation = (
  coord: { lat: number; lng: number; title: string; subtitle?: string },
  id: string
) => {
  if (!window.mapkit) return null;
  const mapkit = window.mapkit;
  const glyphImage = createGlyphImage(mapkit, PIN_ICON_SIZE);

  const annotation = new mapkit.MarkerAnnotation(new mapkit.Coordinate(coord.lat, coord.lng), {
    color: BRAND_BLUE,
    title: coord.title,
    subtitle: coord.subtitle,
    glyphImage,
    glyphText: "",
  });
  annotation.data = { id };
  return annotation;
};

const getMerchantCoords = (merchant: Merchant) => {
  if (merchant.latitude == null || merchant.longitude == null) return null;
  const lat = Number(merchant.latitude);
  const lng = Number(merchant.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapkit.Map | null>(null);
  const annotationsRef = useRef<mapkit.Annotation[]>([]);
  const userAnnotationRef = useRef<mapkit.MarkerAnnotation | null>(null);
  const radiusOverlayRef = useRef<mapkit.CircleOverlay | null>(null);
  const selectedAnnotationRef = useRef<mapkit.MarkerAnnotation | null>(null);
  const mapkitInitializedRef = useRef(false);
  const CHAPEL_HILL_CENTER = { lat: 35.9132, lng: -79.0558 };
  const CHAPEL_HILL_SPAN = { latDelta: 0.012, lngDelta: 0.012 };
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(CHAPEL_HILL_CENTER);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapkitReady, setMapkitReady] = useState(false);
  const [mapkitError, setMapkitError] = useState<string | null>(null);

  useEffect(() => {
    if (!APPLE_MAPS_TOKEN) {
      setMapkitError("Apple Maps token missing.");
      return;
    }

    if (window.mapkit && mapkitInitializedRef.current) {
      setMapkitReady(true);
      return;
    }

    const initMapkit = () => {
      if (!window.mapkit || mapkitInitializedRef.current) return;
      window.mapkit.init({
        authorizationCallback: (done: (token: string) => void) => done(APPLE_MAPS_TOKEN),
      });
      mapkitInitializedRef.current = true;
      setMapkitReady(true);
    };

    if (window.mapkit) {
      initMapkit();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js";
    script.async = true;
    script.onload = initMapkit;
    script.onerror = () => setMapkitError("Failed to load Apple Maps.");
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);
          setMapCenter(loc);
        },
        (error) => {
          console.warn("Geolocation unavailable, defaulting to Chapel Hill:", error.message);
          // Keep mapCenter as Chapel Hill default, no error shown
        }
      );
    }
  }, []);

  const {
    data: merchants,
    isLoading,
  } = useQuery({
    queryKey: ["merchants-with-attributes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select(`
          *,
          merchant_attributes_junction (
            attribute:merchant_attributes (
              id,
              name
            )
          )
        `)
        .order("name");

      if (!error) return data;

      const { data: fallbackData, error: fallbackError } = await supabase
        .from("merchants")
        .select("*")
        .order("name");

      if (fallbackError) throw fallbackError;
      return fallbackData;
    },
  });

  const processedMerchants = useMemo(
    () =>
      merchants?.map((merchant: any) => ({
        ...merchant,
        attributes:
          merchant.merchant_attributes_junction?.map((maj: { attribute: { name: string } }) => maj.attribute.name) || [],
        cover_photo: merchant.cover_photo
          ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/merchant-images/${merchant.cover_photo}`
          : undefined,
      })) || [],
    [merchants]
  );

  const filteredMerchants = useMemo(
    () =>
      (processedMerchants as Merchant[]).filter((merchant) =>
        merchant.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [processedMerchants, searchQuery]
  );

  const applyRegion = (mapkit: typeof window.mapkit, center: { lat: number; lng: number }) => {
    if (!mapRef.current) return;
    mapRef.current.region = new mapkit.CoordinateRegion(
      new mapkit.Coordinate(center.lat, center.lng),
      new mapkit.CoordinateSpan(CHAPEL_HILL_SPAN.latDelta, CHAPEL_HILL_SPAN.lngDelta)
    );
  };

  useEffect(() => {
    if (!mapContainer.current || !mapkitReady || mapRef.current || !window.mapkit) return;

    const mapkit = window.mapkit;

    mapRef.current = new mapkit.Map(mapContainer.current, {
      center: new mapkit.Coordinate(mapCenter.lat, mapCenter.lng),
      showsZoomControl: false,
      showsCompass: mapkit.FeatureVisibility.Hidden,
    });

    applyRegion(mapkit, mapCenter);

    mapRef.current.addEventListener("select", (event: MapKitSelectEvent) => {
      const annotation = event.annotation as mapkit.MarkerAnnotation | undefined;
      if (annotation?.glyphImage && window.mapkit) {
        if (selectedAnnotationRef.current && selectedAnnotationRef.current !== annotation) {
          selectedAnnotationRef.current.glyphImage = createGlyphImage(window.mapkit, PIN_ICON_SIZE);
        }
        selectedAnnotationRef.current = annotation;
        annotation.glyphImage = createGlyphImage(window.mapkit, PIN_SELECTED_SIZE);
      }

      const merchant = event.annotation?.data;
      if (!merchant) return;
      const coords = getMerchantCoords(merchant);
      if (!coords) return;
      setSelectedMerchant(merchant);
      mapRef.current?.setCenterAnimated(new mapkit.Coordinate(coords.lat, coords.lng));
    });

    mapRef.current.addEventListener("deselect", (event: MapKitSelectEvent) => {
      const annotation = event.annotation as mapkit.MarkerAnnotation | undefined;
      if (annotation?.glyphImage && window.mapkit) {
        annotation.glyphImage = createGlyphImage(window.mapkit, PIN_ICON_SIZE);
        if (selectedAnnotationRef.current === annotation) {
          selectedAnnotationRef.current = null;
        }
      }
    });

    setMapLoaded(true);

    return () => {
      if (mapRef.current?.destroy) {
        mapRef.current.destroy();
      }
      mapRef.current = null;
      userAnnotationRef.current = null;
      radiusOverlayRef.current = null;
      setMapLoaded(false);
    };
  }, [mapkitReady, mapCenter]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !window.mapkit) return;
    applyRegion(window.mapkit, mapCenter);
  }, [mapCenter, mapLoaded]);

  // Only show user location marker if we have actual geolocation
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !window.mapkit || !userLocation) return;

    const mapkit = window.mapkit;
    const coordinate = new mapkit.Coordinate(userLocation.lat, userLocation.lng);

    if (!userAnnotationRef.current) {
      userAnnotationRef.current = new mapkit.MarkerAnnotation(coordinate, {
        color: "#122846",
        title: "You",
      });
      mapRef.current.addAnnotation(userAnnotationRef.current);
    } else {
      userAnnotationRef.current.coordinate = coordinate;
    }

    mapRef.current.setCenterAnimated(coordinate);

    if (radiusOverlayRef.current) {
      mapRef.current.removeOverlay(radiusOverlayRef.current);
    }

    radiusOverlayRef.current = new mapkit.CircleOverlay(coordinate, 2000, {
      fillColor: "rgba(59, 130, 246, 0.12)",
      strokeColor: "rgba(59, 130, 246, 0.45)",
      lineWidth: 2,
    });
    mapRef.current.addOverlay(radiusOverlayRef.current);
  }, [mapLoaded, userLocation]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !window.mapkit) return;

    const mapkit = window.mapkit;

    if (annotationsRef.current.length) {
      mapRef.current.removeAnnotations(annotationsRef.current);
      annotationsRef.current = [];
    }

    if (!filteredMerchants.length) return;

    const annotations = filteredMerchants
      .map((merchant) => {
        const coords = getMerchantCoords(merchant);
        if (!coords) return null;

        const annotation = createPinAnnotation(
          {
            lat: coords.lat,
            lng: coords.lng,
            title: merchant.name,
            subtitle: merchant.location || undefined,
          },
          String(merchant.id ?? merchant.name)
        );
        if (!annotation) return null;
        annotation.data = merchant;
        return annotation;
      })
      .filter(Boolean);

    const normalizedAnnotations = annotations as mapkit.MarkerAnnotation[];

    if (normalizedAnnotations.length) {
      mapRef.current.addAnnotations(normalizedAnnotations);
      annotationsRef.current = normalizedAnnotations;
    }
  }, [filteredMerchants, mapLoaded]);

  const isMissingToken = !APPLE_MAPS_TOKEN;
  const isMapReady = mapkitReady && !mapkitError && !isMissingToken;

  return (
    <div className="mobile-screen bottom-nav-space relative w-full">
      <div className="absolute left-4 right-4 z-10" style={{ top: "max(1rem, env(safe-area-inset-top))" }}>
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            type="text"
            placeholder="Search merchants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/95 backdrop-blur-sm shadow-lg border-border"
          />
        </div>
      </div>

      <div className="absolute inset-0">
        <div ref={mapContainer} className="absolute inset-0 map-brand-map" />
        {!isMapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[1px]">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        {isMissingToken || mapkitError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="text-center max-w-sm text-sm text-muted-foreground">
              {mapkitError || "Apple Maps token missing."}
            </div>
          </div>
        ) : null}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[1px]">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      {selectedMerchant && (
        <div className="absolute left-4 right-4 z-10" style={{ bottom: "calc(6rem + env(safe-area-inset-bottom))" }}>
          <Card className="p-4 bg-background/95 backdrop-blur-sm shadow-xl">
            <div className="flex gap-4">
              {selectedMerchant.cover_photo && (
                <img
                  src={selectedMerchant.cover_photo}
                  alt={selectedMerchant.name}
                  className="w-24 h-24 object-cover rounded-lg"
                  loading="lazy"
                  decoding="async"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{selectedMerchant.name}</h3>
                {selectedMerchant.location && (
                  <p className="text-sm text-muted-foreground mb-2">{selectedMerchant.location}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {selectedMerchant.attributes.map((attr: string) => (
                    <span key={attr} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      {attr}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}


      <BottomNav />
    </div>
  );
};

export default Map;
