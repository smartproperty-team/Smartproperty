// ===========================================
// Icons for the listings search bar and filters
// ===========================================

import type { PropertyCategory, PropertyType } from "@/types/property";
import type { FeatureFilter } from "@/utils/listingFilters";
import {
  ArrowUpDown,
  Briefcase,
  Building,
  Building2,
  Car,
  ConciergeBell,
  CookingPot,
  DoorOpen,
  Fence,
  Flame,
  House,
  KeyRound,
  LandPlot,
  LayoutGrid,
  PawPrint,
  Sailboat,
  ShieldCheck,
  Snowflake,
  Sofa,
  Sparkles,
  Sun,
  TreePalm,
  Trees,
  UtensilsCrossed,
  WashingMachine,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";

export const TYPE_ICONS: Record<PropertyType, LucideIcon> = {
  apartment: Building2,
  house: House,
  villa: TreePalm,
  studio: DoorOpen,
  condo: Building,
  land: LandPlot,
};

export const CATEGORY_ICONS: Record<PropertyCategory | "any", LucideIcon> = {
  any: LayoutGrid,
  rental: KeyRound,
  sale: House,
  management: Briefcase,
};

export const FEATURE_ICONS: Record<FeatureFilter, LucideIcon> = {
  furnished: Sofa,
  petFriendly: PawPrint,
  hasParking: Car,
};

const AMENITY_ICONS: Record<string, LucideIcon> = {
  "air conditioning": Snowflake,
  heating: Flame,
  wifi: Wifi,
  parking: Car,
  elevator: ArrowUpDown,
  balcony: Fence,
  terrace: Sun,
  garden: Trees,
  pool: Waves,
  "sea view": Sailboat,
  furnished: Sofa,
  "equipped kitchen": CookingPot,
  "washing machine": WashingMachine,
  dishwasher: UtensilsCrossed,
  security: ShieldCheck,
  concierge: ConciergeBell,
};

export const amenityIcon = (amenity: string): LucideIcon =>
  AMENITY_ICONS[amenity.toLowerCase()] ?? Sparkles;
