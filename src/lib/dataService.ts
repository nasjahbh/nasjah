import { Fabric, Order, Expense } from '../types';
import { supabase } from './supabase';

export const EVENT_DATA_UPDATED = 'nasjah_store_data_updated';

export interface StoreData {
  orders: Order[];
  expenses: Expense[];
  inventory: Fabric[];
}

let isSyncing = false;
let realtimeChannelSubscribed = false;

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
 * Strips heavy base64 strings from inventory before saving to auth metadata
 * to prevent Supabase JWT token overflow (HTTP 431 / payload size errors)
 */
function sanitizeInventoryForMetadata(inventory: Fabric[]): Fabric[] {
  return inventory.map(item => ({
    ...item,
    imageUrl: item.imageUrl && item.imageUrl.length > 500 ? '' : item.imageUrl,
    image: item.image && item.image.length > 500 ? '' : item.image
  }));
}

/**
 * Saves store data to both Supabase PostgreSQL tables and server API,
 * as well as lightweight user metadata.
 */
export async function syncToSupabase(data: StoreData): Promise<void> {
  if (!supabase) return;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session) return;

    const userId = session.user.id;

    // 1. Synchronize Orders table
    try {
      const orderIds = data.orders.map(o => o.id);
      if (orderIds.length > 0) {
        const mappedOrders = data.orders.map(o => ({
          id: o.id,
          user_id: userId,
          customer_name: o.customerName || '',
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

        // Delete any orders from Supabase that were deleted locally
        const inClause = `(${orderIds.map(id => `"${id}"`).join(',')})`;
        await supabase.from('orders').delete().eq('user_id', userId).not('id', 'in', inClause);
      } else {
        // All orders deleted
        await supabase.from('orders').delete().eq('user_id', userId);
      }
    } catch (orderErr) {
      console.warn('Orders cloud sync note:', orderErr);
    }

    // 2. Synchronize Expenses table
    try {
      const expenseIds = data.expenses.map(e => e.id);
      if (expenseIds.length > 0) {
        const mappedExpenses = data.expenses.map(e => ({
          id: e.id,
          user_id: userId,
          description: e.description || '',
          amount: Number(e.amount) || 0,
          category: e.category || 'أقمشة ومواد خام',
          payment_method: e.paymentMethod || 'بنفت بي',
          paid_to: e.paidTo || '',
          notes: e.notes || '',
          created_at_ms: e.createdAt || Date.now()
        }));
        await supabase.from('expenses').upsert(mappedExpenses);

        // Delete any expenses from Supabase that were deleted locally
        const inClause = `(${expenseIds.map(id => `"${id}"`).join(',')})`;
        await supabase.from('expenses').delete().eq('user_id', userId).not('id', 'in', inClause);
      } else {
        // All expenses deleted
        await supabase.from('expenses').delete().eq('user_id', userId);
      }
    } catch (expErr) {
      console.warn('Expenses cloud sync note:', expErr);
    }

    // 3. Synchronize Inventory table
    try {
      const inventoryIds = data.inventory.map(f => f.id);
      if (inventoryIds.length > 0) {
        const mappedInventory = data.inventory.map(f => ({
          id: f.id,
          user_id: userId,
          name: f.name || '',
          quantity: Number(f.quantity) || 0,
          price: Number(f.price) || 0,
          category: f.category || '',
          image_url: f.imageUrl || f.image || '',
          barcode: f.barcode || ''
        }));
        await supabase.from('inventory').upsert(mappedInventory);

        // Delete any fabrics from Supabase that were deleted locally
        const inClause = `(${inventoryIds.map(id => `"${id}"`).join(',')})`;
        await supabase.from('inventory').delete().eq('user_id', userId).not('id', 'in', inClause);
      } else {
        // All inventory deleted
        await supabase.from('inventory').delete().eq('user_id', userId);
      }
    } catch (invErr) {
      console.warn('Inventory cloud sync note:', invErr);
    }

    // 4. Safe user metadata fallback (lightweight data only)
    try {
      await supabase.auth.updateUser({
        data: {
          store_data: {
            orders: data.orders,
            expenses: data.expenses,
            inventory: sanitizeInventoryForMetadata(data.inventory),
            lastUpdated: Date.now()
          }
        }
      });
    } catch (metaErr) {
      // safe fallback
    }
  } catch (err) {
    console.warn('Supabase sync overall error:', err);
  }
}

/**
 * Initializes Supabase Realtime subscriptions so mobile and desktop sync live
 */
export function setupRealtimeSubscription() {
  if (realtimeChannelSubscribed || !supabase) return;
  realtimeChannelSubscribed = true;

  try {
    const channel = supabase.channel('nasjah_db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        syncWithServer();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        syncWithServer();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        syncWithServer();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelSubscribed = false;
    };
  } catch {
    // ignore
  }
}

/**
 * Fetches latest records from Supabase Cloud and/or server backend
 */
export async function syncWithServer(): Promise<StoreData> {
  if (isSyncing) return getLocalData();
  isSyncing = true;

  try {
    setupRealtimeSubscription();

    const local = getLocalData();
    let cloudOrders: Order[] | null = null;
    let cloudExpenses: Expense[] | null = null;
    let cloudInventory: Fabric[] | null = null;
    let tablesQueriedSuccessfully = false;

    // STEP 1: Attempt to load from Supabase directly
    if (supabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (session) {
          try {
            const [ordersRes, expRes, invRes] = await Promise.all([
              supabase.from('orders').select('*').order('created_at_ms', { ascending: false }),
              supabase.from('expenses').select('*').order('created_at_ms', { ascending: false }),
              supabase.from('inventory').select('*')
            ]);

            if (!ordersRes.error && Array.isArray(ordersRes.data)) {
              tablesQueriedSuccessfully = true;
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

            if (!expRes.error && Array.isArray(expRes.data)) {
              tablesQueriedSuccessfully = true;
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

            if (!invRes.error && Array.isArray(invRes.data)) {
              tablesQueriedSuccessfully = true;
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
          } catch (tableErr) {
            console.warn('Tables query note:', tableErr);
          }

          // If tables returned empty arrays, but local has data from before table creation,
          // migrate local data up to the newly created tables!
          if (tablesQueriedSuccessfully) {
            const hasLocalData = local.orders.length > 0 || local.expenses.length > 0 || local.inventory.length > 0;
            const cloudIsEmpty = (cloudOrders?.length ?? 0) === 0 && (cloudExpenses?.length ?? 0) === 0 && (cloudInventory?.length ?? 0) === 0;

            if (cloudIsEmpty && hasLocalData) {
              await syncToSupabase(local);
              cloudOrders = local.orders;
              cloudExpenses = local.expenses;
              cloudInventory = local.inventory;
            }
          }

          // If tables were not queried (e.g. RLS or network issue), fallback to user metadata
          if (!tablesQueriedSuccessfully) {
            const metaStore = session.user.user_metadata?.store_data;
            if (metaStore) {
              if (!cloudOrders && Array.isArray(metaStore.orders)) cloudOrders = metaStore.orders;
              if (!cloudExpenses && Array.isArray(metaStore.expenses)) cloudExpenses = metaStore.expenses;
              if (!cloudInventory && Array.isArray(metaStore.inventory)) cloudInventory = metaStore.inventory;
            }
          }
        }
      } catch (sbErr) {
        console.warn('Supabase cloud fetch error:', sbErr);
      }
    }

    // STEP 2: Fallback to Node server endpoint if cloud returned nothing
    if (cloudOrders === null && cloudExpenses === null && cloudInventory === null) {
      try {
        const res = await fetch('/api/store-data', {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const serverData = await res.json();
          if (serverData.success) {
            if (Array.isArray(serverData.orders)) cloudOrders = serverData.orders;
            if (Array.isArray(serverData.expenses)) cloudExpenses = serverData.expenses;
            if (Array.isArray(serverData.inventory)) cloudInventory = serverData.inventory;
          }
        }
      } catch {
        // Node backend not reachable
      }
    }

    // STEP 3: Apply latest state
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
    // ignore
  }
}

/**
 * Permanently deletes a single order across Supabase, Backend, and Local cache
 */
export async function deleteOrderPermanently(orderId: string): Promise<Order[]> {
  const current = getLocalData();
  const updatedOrders = current.orders.filter(o => o.id !== orderId);
  
  localStorage.setItem('ordersData', JSON.stringify(updatedOrders));
  localStorage.removeItem('insights_timestamp');
  notifyDataChanged();

  // 1. Direct delete from Supabase table
  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        await supabase.from('orders').delete().eq('id', orderId).eq('user_id', userId);
      } else {
        await supabase.from('orders').delete().eq('id', orderId);
      }
    } catch (e) {
      console.warn('Supabase order delete note:', e);
    }
  }

  // 2. Direct delete from Node server
  try {
    await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { method: 'DELETE' });
  } catch {}

  // 3. Update full sync to keep user metadata in sync
  current.orders = updatedOrders;
  syncToSupabase(current).catch(() => {});

  return updatedOrders;
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
    // ignore
  }
}

/**
 * Permanently deletes a single expense across Supabase, Backend, and Local cache
 */
export async function deleteExpensePermanently(expenseId: string): Promise<Expense[]> {
  const current = getLocalData();
  const updatedExpenses = current.expenses.filter(e => e.id !== expenseId);

  localStorage.setItem('expensesData', JSON.stringify(updatedExpenses));
  localStorage.removeItem('insights_timestamp');
  notifyDataChanged();

  // 1. Direct delete from Supabase table
  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        await supabase.from('expenses').delete().eq('id', expenseId).eq('user_id', userId);
      } else {
        await supabase.from('expenses').delete().eq('id', expenseId);
      }
    } catch (e) {
      console.warn('Supabase expense delete note:', e);
    }
  }

  // 2. Direct delete from Node server
  try {
    await fetch(`/api/expenses/${encodeURIComponent(expenseId)}`, { method: 'DELETE' });
  } catch {}

  // 3. Update full sync to keep user metadata in sync
  current.expenses = updatedExpenses;
  syncToSupabase(current).catch(() => {});

  return updatedExpenses;
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
    // ignore
  }
}

/**
 * Permanently deletes a single fabric item across Supabase, Backend, and Local cache
 */
export async function deleteFabricPermanently(fabricId: string): Promise<Fabric[]> {
  const current = getLocalData();
  const updatedInventory = current.inventory.filter(f => f.id !== fabricId);

  localStorage.setItem('inventory', JSON.stringify(updatedInventory));
  notifyDataChanged();

  // 1. Direct delete from Supabase table
  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        await supabase.from('inventory').delete().eq('id', fabricId).eq('user_id', userId);
      } else {
        await supabase.from('inventory').delete().eq('id', fabricId);
      }
    } catch (e) {
      console.warn('Supabase fabric delete note:', e);
    }
  }

  // 2. Direct delete from Node server
  try {
    await fetch(`/api/inventory/${encodeURIComponent(fabricId)}`, { method: 'DELETE' });
  } catch {}

  // 3. Update full sync to keep user metadata in sync
  current.inventory = updatedInventory;
  syncToSupabase(current).catch(() => {});

  return updatedInventory;
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
  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        await Promise.all([
          supabase.from('orders').delete().eq('user_id', userId),
          supabase.from('expenses').delete().eq('user_id', userId)
        ]);
      } else {
        await Promise.all([
          supabase.from('orders').delete().neq('id', ''),
          supabase.from('expenses').delete().neq('id', '')
        ]);
      }
    } catch {}
  }

  syncToSupabase(current).catch(() => {});

  try {
    await fetch('/api/reset-data', { method: 'POST' });
  } catch {}
}

