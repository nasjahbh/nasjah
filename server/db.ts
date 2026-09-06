import fs from "fs";
import path from "path";

// Master account UID - strictly kept server-side to protect founder data privacy
export const MASTER_USER_UID = process.env.MASTER_USER_UID || "0843d2d4-0702-4ecf-800b-956155367d0a";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "database.json");

export interface UserStoreData {
  orders: any[];
  expenses: any[];
  inventory: any[];
  lastUpdated: number;
}

export interface DatabaseSchema {
  version: number;
  users: Record<string, UserStoreData>;
}

const DEFAULT_INVENTORY = [
  {
    id: "fab-1",
    name: "حرير هندي طبيعي",
    quantity: 25,
    price: 18,
    category: "حرير",
    imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&q=80"
  },
  {
    id: "fab-2",
    name: "دانتيل فرنسي مطرز فاخر",
    quantity: 12,
    price: 35,
    category: "دانتيل",
    imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80"
  },
  {
    id: "fab-3",
    name: "كريب صالونا ملكي",
    quantity: 40,
    price: 9,
    category: "كريب"
  },
  {
    id: "fab-4",
    name: "كتان إيطالي نقي",
    quantity: 2, // Low stock indicator
    price: 14,
    category: "كتان"
  }
];

function ensureDirectoryExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

function readDatabase(): DatabaseSchema {
  ensureDirectoryExists();
  if (!fs.existsSync(DB_FILE)) {
    const initialDb: DatabaseSchema = {
      version: 1,
      users: {
        [MASTER_USER_UID]: {
          orders: [],
          expenses: [],
          inventory: DEFAULT_INVENTORY,
          lastUpdated: Date.now()
        }
      }
    };
    writeDatabase(initialDb);
    return initialDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed.users) parsed.users = {};
    if (!parsed.users[MASTER_USER_UID]) {
      parsed.users[MASTER_USER_UID] = {
        orders: [],
        expenses: [],
        inventory: DEFAULT_INVENTORY,
        lastUpdated: Date.now()
      };
      writeDatabase(parsed);
    }
    return parsed;
  } catch (err) {
    console.error("Error reading database file, recovering:", err);
    const fallbackDb: DatabaseSchema = {
      version: 1,
      users: {
        [MASTER_USER_UID]: {
          orders: [],
          expenses: [],
          inventory: DEFAULT_INVENTORY,
          lastUpdated: Date.now()
        }
      }
    };
    writeDatabase(fallbackDb);
    return fallbackDb;
  }
}

function writeDatabase(db: DatabaseSchema): void {
  ensureDirectoryExists();
  const tmpFile = `${DB_FILE}.tmp`;
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), "utf-8");
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    // If atomic rename fails, fallback to direct write
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  }
}

export function getUserData(): { orders: any[]; expenses: any[]; inventory: any[] } {
  const db = readDatabase();
  const userData = db.users[MASTER_USER_UID] || {
    orders: [],
    expenses: [],
    inventory: [],
    lastUpdated: Date.now()
  };

  // Strictly sanitize: NEVER leak MASTER_USER_UID or internal DB metadata to the response
  return {
    orders: userData.orders || [],
    expenses: userData.expenses || [],
    inventory: userData.inventory || []
  };
}

export function syncUserData(payload: {
  orders?: any[];
  expenses?: any[];
  inventory?: any[];
}): { success: boolean; totalOrders: number; totalExpenses: number; totalInventory: number } {
  const db = readDatabase();
  const current = db.users[MASTER_USER_UID] || {
    orders: [],
    expenses: [],
    inventory: DEFAULT_INVENTORY,
    lastUpdated: Date.now()
  };

  if (Array.isArray(payload.orders)) {
    current.orders = payload.orders;
  }
  if (Array.isArray(payload.expenses)) {
    current.expenses = payload.expenses;
  }
  if (Array.isArray(payload.inventory)) {
    current.inventory = payload.inventory;
  }
  current.lastUpdated = Date.now();

  db.users[MASTER_USER_UID] = current;
  writeDatabase(db);

  return {
    success: true,
    totalOrders: current.orders.length,
    totalExpenses: current.expenses.length,
    totalInventory: current.inventory.length
  };
}

export function saveOrder(order: any): any {
  const db = readDatabase();
  const current = db.users[MASTER_USER_UID];
  const list = current.orders || [];

  const existingIndex = list.findIndex((o) => o.id === order.id);
  if (existingIndex >= 0) {
    list[existingIndex] = { ...list[existingIndex], ...order };
  } else {
    list.unshift(order);
  }

  current.orders = list;
  current.lastUpdated = Date.now();
  db.users[MASTER_USER_UID] = current;
  writeDatabase(db);
  return order;
}

export function deleteOrder(orderId: string): boolean {
  const db = readDatabase();
  const current = db.users[MASTER_USER_UID];
  const list = current.orders || [];
  current.orders = list.filter((o) => o.id !== orderId);
  current.lastUpdated = Date.now();
  db.users[MASTER_USER_UID] = current;
  writeDatabase(db);
  return true;
}

export function saveExpense(expense: any): any {
  const db = readDatabase();
  const current = db.users[MASTER_USER_UID];
  const list = current.expenses || [];

  const existingIndex = list.findIndex((e) => e.id === expense.id);
  if (existingIndex >= 0) {
    list[existingIndex] = { ...list[existingIndex], ...expense };
  } else {
    list.unshift(expense);
  }

  current.expenses = list;
  current.lastUpdated = Date.now();
  db.users[MASTER_USER_UID] = current;
  writeDatabase(db);
  return expense;
}

export function deleteExpense(expenseId: string): boolean {
  const db = readDatabase();
  const current = db.users[MASTER_USER_UID];
  const list = current.expenses || [];
  current.expenses = list.filter((e) => e.id !== expenseId);
  current.lastUpdated = Date.now();
  db.users[MASTER_USER_UID] = current;
  writeDatabase(db);
  return true;
}

export function saveInventoryItem(item: any): any {
  const db = readDatabase();
  const current = db.users[MASTER_USER_UID];
  const list = current.inventory || [];

  const existingIndex = list.findIndex((f) => f.id === item.id);
  if (existingIndex >= 0) {
    list[existingIndex] = { ...list[existingIndex], ...item };
  } else {
    list.unshift(item);
  }

  current.inventory = list;
  current.lastUpdated = Date.now();
  db.users[MASTER_USER_UID] = current;
  writeDatabase(db);
  return item;
}

export function deleteInventoryItem(itemId: string): boolean {
  const db = readDatabase();
  const current = db.users[MASTER_USER_UID];
  const list = current.inventory || [];
  current.inventory = list.filter((f) => f.id !== itemId);
  current.lastUpdated = Date.now();
  db.users[MASTER_USER_UID] = current;
  writeDatabase(db);
  return true;
}

export function resetStoreData(): boolean {
  const db = readDatabase();
  db.users[MASTER_USER_UID] = {
    orders: [],
    expenses: [],
    inventory: DEFAULT_INVENTORY,
    lastUpdated: Date.now()
  };
  writeDatabase(db);
  return true;
}
