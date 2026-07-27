const QUEUE_KEY = "la-rivalite-write-queue";
const RETRY_INTERVAL = 4000;

let queue = loadQueue();
let retryTimer = null;
let isOnline = navigator.onLine;
let listeners = [];

function loadQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistQueue() {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } 
  catch (e) { console.error("Failed to persist write queue:", e); }
  notifyListeners();
}

function notifyListeners() { listeners.forEach(fn => fn(queue.length)); }

export function onQueueChange(fn) {
  listeners.push(fn);
  fn(queue.length);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

export function getQueueLength() { return queue.length; }

export function removeQueuedWrite(queueId) {
  const before = queue.length;
  queue = queue.filter(item => item.id !== queueId);
  if (queue.length !== before) { persistQueue(); return true; }
  return false;
}

export function findQueuedWrite(queueId) {
  return queue.find(item => item.id === queueId) ?? null;
}

const handlers = {};
export function registerHandler(type, fn) { handlers[type] = fn; }

// Returns { success, result, queueId }
export async function queueWrite(type, payload) {
  const queueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const item = { id: queueId, type, payload, attempts: 0 };

  const response = await tryWrite(item);

  if (!response.success) {
    queue.push(item);
    persistQueue();
    scheduleRetry();
    return { queueId, deliveryId: null };
  }

  return { queueId: null, deliveryId: response.result?.id ?? null };
}

async function tryWrite(item) {
  const handler = handlers[item.type];
  if (!handler) {
    console.error(`No handler for write type: ${item.type}`);
    return { success: true, result: null };
  }

  try {
    const result = await handler(item.payload);
    return { success: true, result };
  } catch (err) {
    const isPermanent =
      err?.code === "23503" || err?.code === "23505" ||
      err?.code === "42501" || err?.code === "22P02";

    if (isPermanent) {
      console.error(`Permanent error — dropping:`, item.type, err);
      return { success: true, result: null };
    }

    console.warn(`Write failed (will retry): ${item.type}`, err);
    return { success: false, result: null };
  }
}

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setInterval(async () => {
    if (queue.length === 0) { clearInterval(retryTimer); retryTimer = null; return; }
    await flushQueue();
  }, RETRY_INTERVAL);
}

export function clearQueue() {
  queue = [];
  persistQueue();
  if (retryTimer) { clearInterval(retryTimer); retryTimer = null; }
}

export async function flushQueue() {
  if (queue.length === 0) return;
  const remaining = [];
  for (const item of queue) {
    item.attempts += 1;
    const { success } = await tryWrite(item);
    if (!success && item.attempts < 50) remaining.push(item);
  }
  queue = remaining;
  persistQueue();
}

window.addEventListener("online", () => { isOnline = true; flushQueue(); });
window.addEventListener("offline", () => { isOnline = false; });

export function isOnlineNow() { return isOnline; }

if (typeof window !== "undefined") {
  setTimeout(flushQueue, 1000);
  if (queue.length > 0) scheduleRetry();
}