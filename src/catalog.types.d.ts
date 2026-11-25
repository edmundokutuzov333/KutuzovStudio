import type { Database } from './database.types';
type Row = Database['public']['Tables']['studio_formats']['Row'];
export type StudioFormatRow = Omit<Row,'published'|'product'> & {product:'card'|'badge'};
export type StudioFormatRecord = Row;
export type CatalogResult = {formats:readonly StudioFormatRow[];source:'local'|'supabase'|'fallback'};
