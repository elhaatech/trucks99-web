import { withAppBasePath } from "@/lib/appConfig";

export const HERO_TRUCK_IMAGES = [
  { src: withAppBasePath("/images/hero/truck-hero-1.png"), alt: "Semi truck on highway" },
  { src: withAppBasePath("/images/hero/truck-hero-2.png"), alt: "Tipper truck at construction site" },
  { src: withAppBasePath("/images/hero/truck-hero-3.png"), alt: "Intercity coach bus" },
  { src: withAppBasePath("/images/hero/truck-hero-4.png"), alt: "Container trailer truck" },
  { src: withAppBasePath("/images/hero/truck-hero-5.png"), alt: "Heavy mining dump truck" },
  { src: withAppBasePath("/images/hero/truck-hero-6.png"), alt: "Blue cargo box truck" },
] as const;
