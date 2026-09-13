import { Fabric, Order, Expense } from '../types';
import { supabase } from './supabase';

export const EVENT_DATA_UPDATED = 'nasjah_store_data_updated';

export interface StoreData {
  orders: Order[];
  expenses: Expense[];
  inventory: Fabric[];
}

// In-memory runtime store (ZERO localStorage persistence)
let cloudStore: StoreData = {
  orders: [],
  expenses: [],
  inventory: []
};

let isSyncing = false;
let realtimeChannelSubscribed = false;
let isInitialCloudLoadComplete = false;

// Purge any legacy local storage keys from user's device
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('ordersData');
    localStorage.removeItem('expensesData');
    localStorage.removeItem('inventory');
    localStorage.removeItem('insights_data');
    localStorage.removeItem('insights_timestamp');
  } catch {}
}

export function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT_DATA_UPDATED));
  }
}

/**
 * Returns in-memory state fetched purely from the cloud database
 */
export function getCloudData(): StoreData {
  return cloudStore;
}

/**
 * Backward compatibility alias pointing directly to getCloudData
 */
export const getLocalData = getCloudData;

export function isCloudDataReady(): boolean {
  return isInitialCloudLoadComplete;
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
 * as well as lightweight user metadata in the cloud.
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

        // Delete any orders from Supabase that were deleted
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

        // Delete any expenses from Supabase that were deleted
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

        // Delete any fabrics from Supabase that were deleted
        const inClause = `(${inventoryIds.map(id => `"${id}"`).join(',')})`;
        await supabase.from('inventory').delete().eq('user_id', userId).not('id', 'in', inClause);
      } else {
        // All inventory deleted
        await supabase.from('inventory').delete().eq('user_id', userId);
      }
    } catch (invErr) {
      console.warn('Inventory cloud sync note:', invErr);
    }

    // 4. Safe user metadata fallback in Supabase Auth cloud
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
 * Fetches latest records purely from Supabase Cloud and/or cloud server backend.
 * Zero local storage is touched.
 */
export async function syncWithServer(): Promise<StoreData> {
  if (isSyncing) return cloudStore;
  isSyncing = true;

  try {
    setupRealtimeSubscription();

    let cloudOrders: Order[] | null = null;
    let cloudExpenses: Expense[] | null = null;
    let cloudInventory: Fabric[] | null = null;
    let tablesQueriedSuccessfully = false;

    // STEP 1: Attempt to load from Supabase Cloud directly
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

          // If tables returned empty or errored, check user metadata in Supabase
          if (!tablesQueriedSuccessfully || (cloudOrders?.length === 0 && cloudExpenses?.length === 0 && cloudInventory?.length === 0)) {
            const metaStore = session.user.user_metadata?.store_data;
            if (metaStore) {
              if ((!cloudOrders || cloudOrders.length === 0) && Array.isArray(metaStore.orders)) cloudOrders = metaStore.orders;
              if ((!cloudExpenses || cloudExpenses.length === 0) && Array.isArray(metaStore.expenses)) cloudExpenses = metaStore.expenses;
              if ((!cloudInventory || cloudInventory.length === 0) && Array.isArray(metaStore.inventory)) cloudInventory = metaStore.inventory;
            }
          }
        }
      } catch (sbErr) {
        console.warn('Supabase cloud fetch error:', sbErr);
      }
    }

    // STEP 2: Query Cloud server backend (/api/store-data)
    if (cloudOrders === null || cloudExpenses === null || cloudInventory === null) {
      try {
        const res = await fetch('/api/store-data', {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const serverData = await res.json();
          if (serverData.success) {
            if ((!cloudOrders || cloudOrders.length === 0) && Array.isArray(serverData.orders) && serverData.orders.length > 0) {
              cloudOrders = serverData.orders;
            }
            if ((!cloudExpenses || cloudExpenses.length === 0) && Array.isArray(serverData.expenses) && serverData.expenses.length > 0) {
              cloudExpenses = serverData.expenses;
            }
            if ((!cloudInventory || cloudInventory.length === 0) && Array.isArray(serverData.inventory) && serverData.inventory.length > 0) {
              cloudInventory = serverData.inventory;
            }
          }
        }
      } catch {
        // Node backend not reachable
      }
    }

    // STEP 3: Apply latest state directly to in-memory cloudStore (ZERO localStorage)
    cloudStore = {
      orders: cloudOrders !== null ? cloudOrders : cloudStore.orders,
      expenses: cloudExpenses !== null ? cloudExpenses : cloudStore.expenses,
      inventory: cloudInventory !== null ? cloudInventory : cloudStore.inventory
    };
    isInitialCloudLoadComplete = true;

    notifyDataChanged();
    return cloudStore;
  } catch (err) {
    console.warn('Cloud data sync fallback:', err);
    return cloudStore;
  } finally {
    isSyncing = false;
  }
}

/**
 * Persists orders purely to cloud databases (Supabase Cloud and Cloud Server API)
 */
export async function persistOrders(orders: Order[]): Promise<void> {
  cloudStore.orders = orders;
  notifyDataChanged();

  // 1. Sync to Supabase Cloud
  syncToSupabase(cloudStore).catch(() => {});

  // 2. Sync to Cloud Backend
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
 * Permanently deletes a single order across cloud databases
 */
export async function deleteOrderPermanently(orderId: string): Promise<Order[]> {
  const updatedOrders = cloudStore.orders.filter(o => o.id !== orderId);
  cloudStore.orders = updatedOrders;
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

  // 2. Direct delete from Cloud server
  try {
    await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { method: 'DELETE' });
  } catch {}

  // 3. Update full sync to keep user metadata in sync
  syncToSupabase(cloudStore).catch(() => {});

  return updatedOrders;
}

/**
 * Persists expenses purely to cloud databases (Supabase Cloud and Cloud Server API)
 */
export async function persistExpenses(expenses: Expense[]): Promise<void> {
  cloudStore.expenses = expenses;
  notifyDataChanged();

  // 1. Sync to Supabase Cloud
  syncToSupabase(cloudStore).catch(() => {});

  // 2. Sync to Cloud Backend
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
 * Permanently deletes a single expense across cloud databases
 */
export async function deleteExpensePermanently(expenseId: string): Promise<Expense[]> {
  const updatedExpenses = cloudStore.expenses.filter(e => e.id !== expenseId);
  cloudStore.expenses = updatedExpenses;
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

  // 2. Direct delete from Cloud server
  try {
    await fetch(`/api/expenses/${encodeURIComponent(expenseId)}`, { method: 'DELETE' });
  } catch {}

  // 3. Update full sync to keep user metadata in sync
  syncToSupabase(cloudStore).catch(() => {});

  return updatedExpenses;
}

/**
 * Persists inventory fabrics purely to cloud databases (Supabase Cloud and Cloud Server API)
 */
export async function persistInventory(inventory: Fabric[]): Promise<void> {
  cloudStore.inventory = inventory;
  notifyDataChanged();

  // 1. Sync to Supabase Cloud
  syncToSupabase(cloudStore).catch(() => {});

  // 2. Sync to Cloud Backend
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
 * Permanently deletes a single fabric item across cloud databases
 */
export async function deleteFabricPermanently(fabricId: string): Promise<Fabric[]> {
  const updatedInventory = cloudStore.inventory.filter(f => f.id !== fabricId);
  cloudStore.inventory = updatedInventory;
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

  // 2. Direct delete from Cloud server
  try {
    await fetch(`/api/inventory/${encodeURIComponent(fabricId)}`, { method: 'DELETE' });
  } catch {}

  // 3. Update full sync to keep user metadata in sync
  syncToSupabase(cloudStore).catch(() => {});

  return updatedInventory;
}

/**
 * Resets data purely on cloud databases
 */
export async function resetDatabase(): Promise<void> {
  cloudStore.orders = [];
  cloudStore.expenses = [];
  notifyDataChanged();

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

  syncToSupabase(cloudStore).catch(() => {});

  try {
    await fetch('/api/reset-data', { method: 'POST' });
  } catch {}
}

