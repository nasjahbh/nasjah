import { createClient } from "@supabase/supabase-js";

const FULL_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwam96dXR1emRmb3N6cWZvZ2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NzYwMDQsImV4cCI6MjEwNDA1MjAwNH0.FjsZgQQLRaVGGUmspfg2SyvpZsL4mYp4GQHQoHJ56JI";
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_URL.startsWith("https://")) 
  ? process.env.VITE_SUPABASE_URL 
  : "https://rpjozutuzdfoszqfogko.supabase.co";

const SUPABASE_ANON_KEY = (process.env.VITE_SUPABASE_ANON_KEY && process.env.VITE_SUPABASE_ANON_KEY.length > 50)
  ? process.env.VITE_SUPABASE_ANON_KEY
  : FULL_ANON_KEY;

const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.length > 50)
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : "";

// Prefer service role key if provided, else anon key
export const serverSupabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export interface SupabaseTableReport {
  tableName: string;
  exists: boolean;
  rowCount: number;
  columns: string[];
  error?: string;
  sample?: any;
}

export interface SupabaseDiagnostics {
  connected: boolean;
  url: string;
  timestamp: number;
  tables: Record<string, SupabaseTableReport>;
}

/**
 * Introspects Supabase PostgreSQL database tables to fully understand schema & content
 */
export async function inspectSupabaseDatabase(): Promise<SupabaseDiagnostics> {
  const tableNames = ["inventory", "orders", "expenses"];
  const tables: Record<string, SupabaseTableReport> = {};

  for (const t of tableNames) {
    try {
      const { data, error, count } = await serverSupabase
        .from(t)
        .select("*", { count: "exact" })
        .limit(1);

      if (error) {
        tables[t] = {
          tableName: t,
          exists: !error.message.includes("Could not find the table"),
          rowCount: 0,
          columns: [],
          error: error.message,
        };
      } else {
        const sampleRow = data && data.length > 0 ? data[0] : null;
        tables[t] = {
          tableName: t,
          exists: true,
          rowCount: count ?? (data ? data.length : 0),
          columns: sampleRow ? Object.keys(sampleRow) : [
            t === "inventory" ? "id, user_id, name, quantity, price, category, image_url, barcode, created_at" :
            t === "orders" ? "id, user_id, customer_name, phone, details, price, total, status, payment_status, payment_method, delivery_method, notes, created_at_ms, created_at" :
            "id, user_id, description, amount, category, payment_method, paid_to, notes, created_at_ms, created_at"
          ],
          sample: sampleRow,
        };
      }
    } catch (err: any) {
      tables[t] = {
        tableName: t,
        exists: false,
        rowCount: 0,
        columns: [],
        error: err.message,
      };
    }
  }

  return {
    connected: true,
    url: SUPABASE_URL,
    timestamp: Date.now(),
    tables,
  };
}

/**
 * Fetches real fabrics directly from Supabase inventory table
 */
export async function getSupabaseFabrics(): Promise<any[]> {
  try {
    const { data, error } = await serverSupabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      name: item.name || "",
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 0),
      category: item.category || "أقمشة رجالية",
      imageUrl: item.image_url || item.imageUrl || item.image || "",
      barcode: item.barcode || "",
      season: item.season || item.season_type || "",
    }));
  } catch (err) {
    console.error("Error fetching Supabase fabrics:", err);
    return [];
  }
}
