/**
 * Session & Connected Device Management for Nasjah Atelier ERP
 * Tracks active devices, last activity, and enables remote session revoking.
 */

export interface ConnectedDevice {
  id: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  loginTime: string;
  lastActive: string;
  ipAddress: string;
  isCurrent: boolean;
}

const STORAGE_KEY_SESSIONS = 'nasjah_active_sessions';
const STORAGE_KEY_CURRENT_SESSION_ID = 'nasjah_current_session_id';

function detectDeviceInfo(): { deviceName: string; deviceType: 'mobile' | 'tablet' | 'desktop'; browser: string; os: string } {
  const ua = navigator.userAgent || '';
  
  // OS Detection
  let os = 'نظام غير معروف';
  if (/iPhone/i.test(ua)) os = 'iPhone (iOS)';
  else if (/iPad/i.test(ua)) os = 'iPad (iPadOS)';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'Apple Mac (macOS)';
  else if (/Windows NT/i.test(ua)) os = 'Windows PC';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Browser Detection
  let browser = 'المتصفح';
  if (/CriOS|Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Google Chrome';
  else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) browser = 'Apple Safari';
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Edg/i.test(ua)) browser = 'Microsoft Edge';

  // Device Type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/iPad|Tablet/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/Mobi|Android|iPhone/i.test(ua)) {
    deviceType = 'mobile';
  }

  const deviceName = `${os} • ${browser}`;

  return { deviceName, deviceType, browser, os };
}

export function getCurrentSessionId(): string {
  let id = localStorage.getItem(STORAGE_KEY_CURRENT_SESSION_ID);
  if (!id) {
    id = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEY_CURRENT_SESSION_ID, id);
  }
  return id;
}

export function registerCurrentSession(): ConnectedDevice {
  const currentId = getCurrentSessionId();
  const info = detectDeviceInfo();
  const now = new Date();
  
  const formattedTime = now.toLocaleDateString('ar-BH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const currentDevice: ConnectedDevice = {
    id: currentId,
    deviceName: info.deviceName,
    deviceType: info.deviceType,
    browser: info.browser,
    os: info.os,
    loginTime: formattedTime,
    lastActive: 'نشط الآن',
    ipAddress: 'اتصال محمي ومشفر',
    isCurrent: true
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    let sessions: ConnectedDevice[] = raw ? JSON.parse(raw) : [];
    
    // Filter out expired or matching current id
    sessions = sessions.filter(s => s.id !== currentId);
    
    // Set other sessions as not current
    sessions = sessions.map(s => ({ ...s, isCurrent: false }));
    
    // Add current to front
    sessions.unshift(currentDevice);
    
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch {
    // Ignore localStorage errors
  }

  return currentDevice;
}

export function getActiveSessions(): ConnectedDevice[] {
  const currentId = getCurrentSessionId();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    let sessions: ConnectedDevice[] = raw ? JSON.parse(raw) : [];

    if (!sessions.some(s => s.id === currentId)) {
      registerCurrentSession();
      const updatedRaw = localStorage.getItem(STORAGE_KEY_SESSIONS);
      sessions = updatedRaw ? JSON.parse(updatedRaw) : [];
    }

    return sessions.map(s => ({
      ...s,
      isCurrent: s.id === currentId
    }));
  } catch {
    return [registerCurrentSession()];
  }
}

export function revokeSession(sessionId: string): ConnectedDevice[] {
  try {
    const currentId = getCurrentSessionId();
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    let sessions: ConnectedDevice[] = raw ? JSON.parse(raw) : [];

    sessions = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));

    return sessions.map(s => ({
      ...s,
      isCurrent: s.id === currentId
    }));
  } catch {
    return [];
  }
}

export function revokeAllOtherSessions(): ConnectedDevice[] {
  const currentId = getCurrentSessionId();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    let sessions: ConnectedDevice[] = raw ? JSON.parse(raw) : [];

    // Keep only the current session
    const current = sessions.find(s => s.id === currentId) || registerCurrentSession();
    const result = [{ ...current, isCurrent: true }];

    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(result));
    return result;
  } catch {
    return [registerCurrentSession()];
  }
}
