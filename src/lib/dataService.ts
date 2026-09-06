import { Fabric, Order, Expense } from '../types';

export const EVENT_DATA_UPDATED = 'nasjah_store_data_updated';

interface StoreData {
  orders: Order[];
  expenses: Expense[];
  inventory: Fabric[];
}

// In-memory cache for fast access
let isSyncing = false;
let hasInitialSynced = false;

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
 * Fetches latest records from the server database (hidden UID on backend)
 * and syncs both ways smoothly.
 */
export async function syncWithServer(): Promise<StoreData> {
  if (isSyncing) return getLocalData();
  isSyncing = true;

  try {
    const local = getLocalData();

    // Fetch from backend server API
    const res = await fetch('/api/store-data', {
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      const serverData = await res.json();
      if (serverData.success) {
        const serverOrders: Order[] = serverData.orders || [];
        const serverExpenses: Expense[] = serverData.expenses || [];
        const serverInventory: Fabric[] = serverData.inventory || [];

        // Server is always authoritative
        localStorage.setItem('ordersData', JSON.stringify(serverOrders));
        localStorage.setItem('expensesData', JSON.stringify(serverExpenses));
        localStorage.setItem('inventory', JSON.stringify(serverInventory));
        notifyDataChanged();
        hasInitialSynced = true;
        return { orders: serverOrders, expenses: serverExpenses, inventory: serverInventory };
      }
    }
  } catch (err) {
    console.warn('Backend sync paused, using offline store:', err);
  } finally {
    isSyncing = false;
  }

  return getLocalData();
}

/**
 * Pushes bulk data to server backend
 */
async function pushSyncToServer(orders?: Order[], expenses?: Expense[], inventory?: Fabric[]) {
  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders, expenses, inventory })
    });
  } catch (err) {
    console.warn('Failed to push to server:', err);
  }
}

/**
 * Saves orders both to persistent server database and local cache
 */
export async function persistOrders(orders: Order[]): Promise<void> {
  localStorage.setItem('ordersData', JSON.stringify(orders));
  localStorage.removeItem('insights_timestamp');
  notifyDataChanged();

  // Asynchronously push to backend database
  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders })
    });
  } catch (e) {
    console.warn('Async order persist error:', e);
  }
}

/**
 * Saves expenses both to persistent server database and local cache
 */
export async function persistExpenses(expenses: Expense[]): Promise<void> {
  localStorage.setItem('expensesData', JSON.stringify(expenses));
  localStorage.removeItem('insights_timestamp');
  notifyDataChanged();

  // Asynchronously push to backend database
  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenses })
    });
  } catch (e) {
    console.warn('Async expense persist error:', e);
  }
}

/**
 * Saves inventory fabrics both to persistent server database and local cache
 */
export async function persistInventory(inventory: Fabric[]): Promise<void> {
  localStorage.setItem('inventory', JSON.stringify(inventory));
  notifyDataChanged();

  // Asynchronously push to backend database
  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory })
    });
  } catch (e) {
    console.warn('Async inventory persist error:', e);
  }
}

/**
 * Resets data both on server database and locally
 */
export async function resetDatabase(): Promise<void> {
  localStorage.removeItem('ordersData');
  localStorage.removeItem('expensesData');
  localStorage.removeItem('insights_timestamp');
  localStorage.removeItem('insights_data');
  notifyDataChanged();

  try {
    await fetch('/api/reset-data', { method: 'POST' });
  } catch (e) {
    console.warn('Reset database error:', e);
  }
}
