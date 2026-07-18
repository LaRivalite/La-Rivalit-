// Offline-safe write queue.
// Any write that fails (no internet) gets stored in localStorage and
// retried automatically when the connection comes back, or on a timer.

const QUEUE_KEY = "la-rivalite-write-queue";
const RETRY_INTERVAL = 4000; // try every 4s while there's a backlog

let queue = loadQueue();
let retryTimer = null;
let isOnline = navigator.onLine;
let listeners = []; // notified when queue length changes (for a "syncing" indicator)

function loadQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistQueue() {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to persist write queue:", e);
  }
  notifyListeners();
}

function notifyListeners() {
  listeners.forEach(fn => fn(queue.length));
}

export function onQueueChange(fn) {
  listeners.push(fn);
  fn(queue.length); // call immediately with current state
  return () => { listeners = listeners.filter(l => l !== fn); };
}

export function getQueueLength() {
  return queue.length;
}

// Register a function that performs the actual Supabase call.
// type identifies which kind of write this is (so we can route it back
// to the right Supabase call when retrying).
const handlers = {};
export function registerHandler(type, fn) {
  handlers[type] = fn;
}

// Queue a write. Tries immediately; if it fails, stores for retry.
export async function queueWrite(type, payload) {
  const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, payload, attempts: 0 };

  const success = await tryWrite(item);
  if (!success) {
    queue.push(item);
    persistQueue();
    scheduleRetry();
  }
}

async function tryWrite(item) {
  const handler = handlers[item.type];
  if (!handler) {
    console.error(`No handler registered for write type: ${item.type}`);
    return true; // drop it, nothing we can do
  }

  try {
    await handler(item.payload);
    return true;
  } catch (err) {
    // Permanent errors (bad foreign key, bad data) will NEVER succeed no
    // matter how many times we retry — drop them immediately instead of
    // retrying forever. Only network/timeout errors should be retried.
    const isPermanentError =
      err?.code === "23503" || // foreign key violation
      err?.code === "23505" || // unique violation
      err?.code === "42501" || // RLS policy violation
      err?.code === "22P02";   // invalid input syntax

    if (isPermanentError) {
      console.error(`Permanent write error — dropping item (will not retry):`, item.type, err);
      return true; // treat as "handled" so it gets removed from queue
    }

    console.warn(`Write failed (will retry): ${item.type}`, err);
    return false;
  }
}

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setInterval(async () => {
    if (queue.length === 0) {
      clearInterval(retryTimer);
      retryTimer = null;
      return;
    }
    await flushQueue();
  }, RETRY_INTERVAL);
}

// Forcibly clear the queue (use when entries are permanently broken,
// e.g. foreign key errors that will never succeed)
export function clearQueue() {
  queue = [];
  persistQueue();
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}

export async function flushQueue() {
  if (queue.length === 0) return;

  const remaining = [];
  for (const item of queue) {
    item.attempts += 1;
    const success = await tryWrite(item);
    if (!success && item.attempts < 50) {
      remaining.push(item);
    }
    // Drop items after 50 failed attempts (avoid infinite growth)
  }
  queue = remaining;
  persistQueue();
}

// Listen for browser online/offline events
window.addEventListener("online", () => {
  isOnline = true;
  flushQueue();
});
window.addEventListener("offline", () => {
  isOnline = false;
});

export function isOnlineNow() {
  return isOnline;
}

// Try flushing on load in case there's a backlog from a previous session
if (typeof window !== "undefined") {
  setTimeout(flushQueue, 1000);
  if (queue.length > 0) scheduleRetry();
}