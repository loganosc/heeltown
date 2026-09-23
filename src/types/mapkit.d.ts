declare namespace mapkit {
  type Callback<T = void> = (value: T) => void;

  class MapKitEventTarget {
    addEventListener(type: string, listener: (event: any) => void): void;
    removeEventListener(type: string, listener: (event: any) => void): void;
  }

  class MapKit extends MapKitEventTarget {}

  interface InitOptions {
    authorizationCallback: (done: (token: string) => void) => void;
    language?: string;
  }

  class Coordinate {
    constructor(latitude: number, longitude: number);
    latitude: number;
    longitude: number;
  }

  class Offset {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }

  type Size = { width: number; height: number };

  class Image {
    constructor(options: { url: string; size?: Size; anchorOffset?: Offset });
    url: string;
    size?: Size;
    anchorOffset?: Offset;
  }

  enum FeatureVisibility {
    Hidden = 0,
    Visible = 1,
    Adaptive = 2,
  }

  class CoordinateSpan {
    constructor(latitudeDelta: number, longitudeDelta: number);
    latitudeDelta: number;
    longitudeDelta: number;
  }

  class CoordinateRegion {
    constructor(center: Coordinate, span: CoordinateSpan);
    center: Coordinate;
    span: CoordinateSpan;
  }

  interface MapConstructorOptions {
    center?: Coordinate;
    showsZoomControl?: boolean;
    showsCompass?: FeatureVisibility;
    region?: CoordinateRegion;
  }

  class Map {
    constructor(element: HTMLElement, options?: MapConstructorOptions);
    region: CoordinateRegion;
    addAnnotation(annotation: Annotation): void;
    addAnnotations(annotations: Annotation[]): void;
    removeAnnotation(annotation: Annotation): void;
    removeAnnotations(annotations: Annotation[]): void;
    addOverlay(overlay: Overlay): void;
    removeOverlay(overlay: Overlay): void;
    addEventListener(type: string, listener: (event: any) => void): void;
    setCenterAnimated(coordinate: Coordinate): void;
    destroy(): void;
  }

  interface Annotation {
    data?: unknown;
    title?: string;
    subtitle?: string;
  }

  class MarkerAnnotation implements Annotation {
    constructor(
      coordinate: Coordinate,
      options?: {
        color?: string;
        title?: string;
        subtitle?: string;
        glyphText?: string;
        glyphImage?: Image;
        glyphImagePadding?: number;
      }
    );
    coordinate: Coordinate;
    data?: unknown;
    title?: string;
    subtitle?: string;
    color?: string;
    glyphText?: string;
    glyphImage?: Image;
    glyphImagePadding?: number;
  }

  interface Overlay {}

  class CircleOverlay implements Overlay {
    constructor(
      coordinate: Coordinate,
      radius: number,
      options?: { fillColor?: string; strokeColor?: string; lineWidth?: number }
    );
  }

  function init(options: InitOptions): void;
}

interface Window {
  mapkit?: typeof mapkit;
}
