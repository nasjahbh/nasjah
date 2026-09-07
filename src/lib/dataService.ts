import { Fabric, Order, Expense } from '../types';
import { supabase } from './supabase';

export const EVENT_DATA_UPDATED = 'nasjah_store_data_updated';

export interface StoreData {
  orders: Order[];
  expenses: Expense[];
  inventory: Fabric[];
}

let isSyncing = false;

export function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT_DATA_UPDATED));
    window.dispatchEvent(new Event('storage'));
  }
}

/**
 * Loads current state from localStorage instantly for 0-latency UI rendering
 */
export function getLocalData(): StoreData {
  try {
    const orders: Order[] = JSON.parse(localStorage.getItem('ordersData') || '[]');
    const expenses: Expense[] = JSON.parse(localStorage.getItem('expensesData') || '[]');
    const inventory: Fabric[] = JSON.parse(localStorage.getItem('inventory') || '[]');
    return { orders, expenses, inventory };
  } catch {
    return { orders: [], expenses: [], inventory: [] };
  }
}

/**
 * Saves store data to both Supabase User Metadata (works on all devices including Vercel/phone without tables)
 * AND Supabase PostgreSQL tables (if created), as well as server API and localStorage.
 */
async function syncToSupabase(data: StoreData) {
  if (!supabase) return;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session) return;

    // 1. Direct Supabase Cloud User Metadata (100% reliable across all phones & devices)
    try {
      await supabase.auth.updateUser({
        data: {
          store_data: {
            orders: data.orders,
            expenses: data.expenses,
            inventory: data.inventory,
            lastUpdated: Date.now()
          }
        }
      });
    } catch (metaErr) {
      console.warn('Supabase user metadata sync error:', metaErr);
    }

    // 2. Also try Supabase PostgreSQL Tables (if user created them in SQL Editor)
    try {
      if (data.orders.length > 0) {
        const mappedOrders = data.orders.map(o => ({
          id: o.id,
          user_id: session.user.id,
          customer_name: o.customerName,
          phone: o.phone || '',
          details: o.details || '',
          price: Number(o.price || o.total || 0),
          total: Number(o.total || o.price || 0),
          status: o.status || 'قيد التجهيز',
          payment_method: o.paymentMethod || 'بنفت بي',
          delivery_method: o.deliveryMethod || '',
          notes: o.notes || '',
          created_at_ms: o.createdAt || Date.now()
        }));
        await supabase.from('orders').upsert(mappedOrders);
      }

      if (data.expenses.length > 0) {
        const mappedExpenses = data.expenses.map(e => ({
          id: e.id,
          user_id: session.user.id,
          description: e.description,
          amount: Number(e.amount) || 0,
          category: e.category || 'أقمشة ومواد خام',
          payment_method: e.paymentMethod || 'بنفت بي',
          paid_to: e.paidTo || '',
          notes: e.notes || '',
          created_at_ms: e.createdAt || Date.now()
        }));
        await supabase.from('expenses').upsert(mappedExpenses);
      }

      if (data.inventory.length > 0) {
        const mappedInventory = data.inventory.map(f => ({
          id: f.id,
          user_id: session.user.id,
          name: f.name,
          quantity: Number(f.quantity) || 0,
          price: Number(f.price) || 0,
          category: f.category || '',
          image_url: f.imageUrl || f.image || '',
          barcode: f.barcode || ''
        }));
        await supabase.from('inventory').upsert(mappedInventory);
      }
    } catch {
      // Schema not created yet, safe to ignore since user metadata stores the data
    }
  } catch (err) {
    console.warn('Supabase sync error:', err);
  }
}

/**
 * Fetches latest records from Supabase Cloud and/or server backend
 */
export async function syncWithServer(): Promise<StoreData> {
  if (isSyncing) return getLocalData();
  isSyncing = true;

  try {
    const local = getLocalData();
    let cloudOrders: Order[] | null = null;
    let cloudExpenses: Expense[] | null = null;
    let cloudInventory: Fabric[] | null = null;

    // STEP 1: Attempt to load from Supabase directly
    if (supabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (session) {
          // A. Try loading from Supabase PostgreSQL tables
          try {
            const [ordersRes, expRes, invRes] = await Promise.all([
              supabase.from('orders').select('*'),
              supabase.from('expenses').select('*'),
              supabase.from('inventory').select('*')
            ]);

            if (!ordersRes.error && ordersRes.data && ordersRes.data.length > 0) {
              cloudOrders = ordersRes.data.map((o: any) => ({
                id: o.id,
                customerName: o.customer_name || o.customerName || '',
                phone: o.phone || '',
                details: o.details || '',
                price: Number(o.price || o.total || 0),
                total: Number(o.total || o.price || 0),
                status: o.status || 'قيد التجهيز',
                paymentMethod: o.payment_method || o.paymentMethod || 'بنفت بي',
                deliveryMethod: o.delivery_method || o.deliveryMethod || '',
                notes: o.notes || '',
                createdAt: Number(o.created_at_ms || (o.created_at ? new Date(o.created_at).getTime() : Date.now()))
              }));
            }

            if (!expRes.error && expRes.data && expRes.data.length > 0) {
              cloudExpenses = expRes.data.map((e: any) => ({
                id: e.id,
                description: e.description || '',
                amount: Number(e.amount || 0),
                category: e.category || 'أقمشة ومواد خام',
                paymentMethod: e.payment_method || e.paymentMethod || 'بنفت بي',
                paidTo: e.paid_to || e.paidTo || '',
                notes: e.notes || '',
                createdAt: Number(e.created_at_ms || (e.created_at ? new Date(e.created_at).getTime() : Date.now()))
              }));
            }

            if (!invRes.error && invRes.data && invRes.data.length > 0) {
              cloudInventory = invRes.data.map((f: any) => ({
                id: f.id,
                name: f.name || '',
                quantity: Number(f.quantity || 0),
                price: Number(f.price || 0),
                category: f.category || '',
                imageUrl: f.image_url || f.imageUrl || '',
                image: f.image_url || f.image || '',
                barcode: f.barcode || ''
              }));
            }
          } catch {
            // Tables might not exist
          }

          // B. Check Supabase Auth user_metadata (holds cloud data for this user account)
          const metaStore = session.user.user_metadata?.store_data;
          if (metaStore) {
            if (!cloudOrders && Array.isArray(metaStore.orders)) cloudOrders = metaStore.orders;
            if (!cloudExpenses && Array.isArray(metaStore.expenses)) cloudExpenses = metaStore.expenses;
            if (!cloudInventory && Array.isArray(metaStore.inventory)) cloudInventory = metaStore.inventory;
          }

          // If Supabase cloud has no data yet, but user had local items, push local to Supabase now
          if (!cloudOrders && !cloudExpenses && !cloudInventory) {
            if (local.orders.length > 0 || local.expenses.length > 0 || local.inventory.length > 0) {
              await syncToSupabase(local);
            }
          }
        }
      } catch (sbErr) {
        console.warn('Supabase cloud fetch error:', sbErr);
      }
    }

    // STEP 2: If running on fullstack container, also query local /api/store-data
    if (!cloudOrders && !cloudExpenses && !cloudInventory) {
      try {
        const res = await fetch('/api/store-data', {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const serverData = await res.json();
          if (serverData.success) {
            if (Array.isArray(serverData.orders) && serverData.orders.length > 0) cloudOrders = serverData.orders;
            if (Array.isArray(serverData.expenses) && serverData.expenses.length > 0) cloudExpenses = serverData.expenses;
            if (Array.isArray(serverData.inventory) && serverData.inventory.length > 0) cloudInventory = serverData.inventory;
          }
        }
      } catch {
        // Node backend not available on this host (e.g. Vercel static)
      }
    }

    // STEP 3: If cloud data exists, apply it
    const finalOrders = cloudOrders !== null ? cloudOrders : local.orders;
    const finalExpenses = cloudExpenses !== null ? cloudExpenses : local.expenses;
    const finalInventory = cloudInventory !== null ? cloudInventory : local.inventory;

    localStorage.setItem('ordersData', JSON.stringify(finalOrders));
    localStorage.setItem('expensesData', JSON.stringify(finalExpenses));
    localStorage.setItem('inventory', JSON.stringify(finalInventory));
    notifyDataChanged();

    return { orders: finalOrders, expenses: finalExpenses, inventory: finalInventory };
  } catch (err) {
    console.warn('Data sync fallback:', err);
    return getLocalData();
  } finally {
    isSyncing = false;
  }
}

/**
 * Persists orders across Supabase cloud, backend server, and local cache
 */
export async function persistOrders(orders: Order[]): Promise<void> {
  localStorage.setItem('ordersData', JSON.stringify(orders));
  localStorage.removeItem('insights_timestamp');
  notifyDataChanged();

  const current = getLocalData();
  current.orders = orders;

  // 1. Sync to Supabase Cloud
  syncToSupabase(current).catch(() => {});

  // 2. Sync to Node Backend
  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders })
    });
  } catch {
    // ignore if running on static host
  }
}

/**
 * Persists expenses across Supabase cloud, backend server, and local cache
 */
export async function persistExpenses(expenses: Expense[]): Promise<void> {
  localStorage.setItem('expensesData', JSON.stringify(expenses));
  localStorage.removeItem('insights_timestamp');
  notifyDataChanged();

  const current = getLocalData();
  current.expenses = expenses;

  // 1. Sync to Supabase Cloud
  syncToSupabase(current).catch(() => {});

  // 2. Sync to Node Backend
  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenses })
    });
  } catch {
    // ignore if running on static host
  }
}

/**
 * Persists inventory fabrics across Supabase cloud, backend server, and local cache
 */
export async function persistInventory(inventory: Fabric[]): Promise<void> {
  localStorage.setItem('inventory', JSON.stringify(inventory));
  notifyDataChanged();

  const current = getLocalData();
  current.inventory = inventory;

  // 1. Sync to Supabase Cloud
  syncToSupabase(current).catch(() => {});

  // 2. Sync to Node Backend
  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory })
    });
  } catch {
    // ignore if running on static host
  }
}

/**
 * Resets data both on cloud databases and locally
 */
export async function resetDatabase(): Promise<void> {
  localStorage.removeItem('ordersData');
  localStorage.removeItem('expensesData');
  localStorage.removeItem('insights_timestamp');
  localStorage.removeItem('insights_data');
  notifyDataChanged();

  const current = getLocalData();
  current.orders = [];
  current.expenses = [];

  // Reset in Supabase
  syncToSupabase(current).catch(() => {});

  if (supabase) {
    try {
      await Promise.all([
        supabase.from('orders').delete().neq('id', ''),
        supabase.from('expenses').delete().neq('id', '')
      ]);
    } catch {}
  }

  try {
    await fetch('/api/reset-data', { method: 'POST' });
  } catch {}
}
