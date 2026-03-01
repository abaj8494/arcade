/**
 * Wireless game logger utility
 * Ring buffer of last 200 entries, always captures logs.
 * Console output enabled with ?wdebug=1 URL param.
 */

const MAX_ENTRIES = 200;

const LogType = {
  SEND: 'SEND',
  RECV: 'RECV',
  STATE: 'STATE',
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
};

const consoleEnabled = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('wdebug');

const entries = [];

function log(type, detail, data) {
  const entry = {
    timestamp: Date.now(),
    time: new Date().toISOString().slice(11, 23),
    type,
    detail,
    data,
  };

  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.shift();
  }

  if (consoleEnabled || type === LogType.ERROR) {
    const prefix = `[WL ${entry.time} ${type}]`;
    if (type === LogType.ERROR) {
      console.error(prefix, detail, data !== undefined ? data : '');
    } else if (type === LogType.WARN) {
      console.warn(prefix, detail, data !== undefined ? data : '');
    } else {
      console.log(prefix, detail, data !== undefined ? data : '');
    }
  }
}

const wirelessLogger = {
  send: (detail, data) => log(LogType.SEND, detail, data),
  recv: (detail, data) => log(LogType.RECV, detail, data),
  state: (detail, data) => log(LogType.STATE, detail, data),
  error: (detail, data) => log(LogType.ERROR, detail, data),
  warn: (detail, data) => log(LogType.WARN, detail, data),
  info: (detail, data) => log(LogType.INFO, detail, data),

  getEntries: () => [...entries],
  clear: () => { entries.length = 0; },
  export: () => JSON.stringify(entries, null, 2),
};

// Expose on window for console access
if (typeof window !== 'undefined') {
  window.__wirelessLog = wirelessLogger;
}

export default wirelessLogger;
export { LogType };
