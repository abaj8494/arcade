import React, { useState, useEffect, useCallback } from 'react';
import wirelessLogger from '../utils/wirelessLogger';

const isDebug = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('wdebug');

const TYPE_COLORS = {
  SEND: 'text-blue-400',
  RECV: 'text-green-400',
  STATE: 'text-purple-400',
  ERROR: 'text-red-400',
  WARN: 'text-yellow-400',
  INFO: 'text-gray-400',
};

const WirelessDebugPanel = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!isDebug) return;
    const id = setInterval(() => {
      setEntries(wirelessLogger.getEntries().slice(-20));
    }, 500);
    return () => clearInterval(id);
  }, []);

  const copyAll = useCallback(() => {
    navigator.clipboard.writeText(wirelessLogger.export()).catch(() => {});
  }, []);

  if (!isDebug) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        zIndex: 9999,
        maxWidth: 420,
        maxHeight: collapsed ? 'auto' : 360,
        fontFamily: 'monospace',
        fontSize: 11,
      }}
      className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl"
    >
      <div
        className="flex items-center justify-between px-2 py-1 cursor-pointer bg-gray-800 rounded-t-lg"
        onClick={() => setCollapsed(c => !c)}
      >
        <span className="text-gray-300 text-xs font-bold">WL Debug ({entries.length})</span>
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); copyAll(); }}
            className="text-xs text-gray-400 hover:text-white px-1"
          >
            Copy
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); wirelessLogger.clear(); setEntries([]); }}
            className="text-xs text-gray-400 hover:text-white px-1"
          >
            Clear
          </button>
          <span className="text-gray-500 text-xs">{collapsed ? '▲' : '▼'}</span>
        </div>
      </div>
      {!collapsed && (
        <div className="overflow-y-auto p-1" style={{ maxHeight: 320 }}>
          {entries.length === 0 && (
            <div className="text-gray-500 text-center py-2">No entries</div>
          )}
          {entries.map((e, i) => (
            <div key={i} className="flex gap-1 py-0.5 border-b border-gray-800 text-xs">
              <span className="text-gray-600 shrink-0">{e.time}</span>
              <span className={`shrink-0 w-10 ${TYPE_COLORS[e.type] || 'text-gray-400'}`}>
                {e.type}
              </span>
              <span className="text-gray-300 truncate">
                {e.detail}
                {e.data !== undefined && (
                  <span className="text-gray-500 ml-1">
                    {typeof e.data === 'object' ? JSON.stringify(e.data) : String(e.data)}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WirelessDebugPanel;
