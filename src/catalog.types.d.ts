// Hand-authored contract aligned to the checked-in migration; not a generated live database type.
export interface StudioFormatRow {
  id: string;
  product: 'card' | 'badge';
  label: string;
  width_mm: number;
  height_mm: number;
  bleed_mm: number;
  safe_mm: number;
  position: number;
}
export interface StudioFormatRecord extends StudioFormatRow { published: boolean }
export type CatalogResult = { formats: readonly StudioFormatRow[]; source: 'local' | 'supabase' | 'fallback' };
