"use client";

import { useState, useEffect } from "react";

interface StatusData {
  mode: string;
  snapshotTimestamp: string | null;
  lastBackupAt: string | null;
  dbConnected: boolean;
}

export function SystemStatus() {
  const [status, setStatus] = useState<StatusData | null>(null);

  useEffect(() => {
    fetch("/api/system/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStatus(data))
      .catch(() => setStatus(null));

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetch("/api/system/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setStatus(data))
        .catch(() => setStatus(null));
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  // Determine display state
  let dotColor = "bg-green-400";
  let label = "Live";
  let detail = "";

  if (!status.dbConnected) {
    dotColor = "bg-red-500";
    label = "Offline";
    detail = "DB unreachable";
  } else if (status.mode === "snapshot") {
    dotColor = "bg-amber-400";
    label = "Snapshot";
    detail = status.snapshotTimestamp
      ? `Data from ${formatTime(status.snapshotTimestamp)}`
      : "Read-only copy";
  } else {
    // Live mode
    if (status.lastBackupAt) {
      const hoursAgo = getHoursAgo(status.lastBackupAt);
      if (hoursAgo > 24) {
        dotColor = "bg-red-500";
        detail = "Backup overdue";
      } else {
        detail = `Synced ${formatRelative(status.lastBackupAt)}`;
      }
    } else {
      detail = "No backup yet";
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-800/50">
      <span className={`h-2 w-2 rounded-full ${dotColor} shrink-0`} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-emerald-100">{label}</p>
        {detail && (
          <p className="text-[10px] sm:text-xs text-emerald-300 truncate">{detail}</p>
        )}
      </div>
    </div>
  );
}

function getHoursAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

function formatRelative(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-LK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
