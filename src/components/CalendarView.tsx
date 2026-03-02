/**
 * Calendar view for items with due dates.
 * Note: Calendar view uses existing items query.
 */

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";
import { useSettings } from "../hooks/useSettings";

interface CalendarViewProps {
  listId: Id<"lists">;
  userDid: string;
  onItemClick?: (item: Doc<"items">) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function CalendarView({ listId, userDid, onItemClick }: CalendarViewProps) {
  const { haptic } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSchedules, setShowSchedules] = useState(true);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);
  const updateScheduleEntry = useMutation("scheduleEntries:updateScheduleEntry" as any);
  
  // Use existing items query
  const allItems = useQuery(api.items.getListItems, { listId });
  
  // Filter items with due dates in current month
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

  const scheduleEntries = useQuery("scheduleEntries:listForList" as any, {
    listId,
    userDid,
    monthStart: monthStart.getTime(),
    monthEnd: monthEnd.getTime(),
  }) as Array<Doc<"scheduleEntries">> | undefined;
  
  const items = useMemo(() => {
    if (!allItems) return [];
    return allItems.filter(item => 
      item.dueDate && 
      item.dueDate >= monthStart.getTime() && 
      item.dueDate <= monthEnd.getTime()
    );
  }, [allItems, monthStart.getTime(), monthEnd.getTime()]);

  // Group items by date
  const itemsByDate = useMemo(() => {
    const map = new Map<string, Doc<"items">[]>();
    
    for (const item of items) {
      if (!item.dueDate) continue;
      const dateKey = new Date(item.dueDate).toDateString();
      const existing = map.get(dateKey) ?? [];
      map.set(dateKey, [...existing, item]);
    }
    return map;
  }, [items]);

  const scheduleByDate = useMemo(() => {
    const map = new Map<string, Array<Doc<"scheduleEntries">>>();
    if (!scheduleEntries) return map;
    for (const entry of scheduleEntries) {
      const t = entry.scheduledAt ?? entry.nextRunAt;
      if (!t) continue;
      const key = new Date(t).toDateString();
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    return map;
  }, [scheduleEntries]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = [];
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), d));
    }
    
    return days;
  }, [currentDate]);

  const goToPreviousMonth = () => {
    haptic("light");
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    haptic("light");
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    haptic("light");
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const toggleScheduleEnabled = async (entry: Doc<"scheduleEntries">) => {
    setToggleError(null);
    setPendingEntryId(entry._id);
    try {
      await updateScheduleEntry({
        entryId: entry._id,
        actorDid: userDid,
        enabled: !entry.enabled,
      });
    } catch (error) {
      setToggleError(error instanceof Error ? error.message : "Failed to update schedule entry");
    } finally {
      setPendingEntryId(null);
    }
  };

  if (!allItems || !scheduleEntries) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setShowSchedules((v) => !v)}
            className={`text-xs px-2 py-1 rounded transition-colors border ${
              showSchedules
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600"
            }`}
          >
            {showSchedules ? "Schedules on" : "Schedules off"}
          </button>
        </div>
        
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      {toggleError && (
        <div className="px-4 py-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/40">
          {toggleError}
        </div>
      )}

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-24 border-b border-r border-gray-100 dark:border-gray-700" />;
          }

          const dateItems = itemsByDate.get(date.toDateString()) ?? [];
          const dateSchedules = showSchedules ? (scheduleByDate.get(date.toDateString()) ?? []) : [];
          const today = isToday(date);

          return (
            <div
              key={date.toISOString()}
              className={`min-h-24 p-1 border-b border-r border-gray-100 dark:border-gray-700 ${
                today ? "bg-amber-50 dark:bg-amber-900/10" : ""
              }`}
            >
              <div className={`text-xs font-medium mb-1 ${
                today 
                  ? "text-amber-600 dark:text-amber-400" 
                  : "text-gray-500 dark:text-gray-400"
              }`}>
                {date.getDate()}
              </div>
              
              <div className="space-y-1">
                {dateItems.slice(0, 2).map((item) => (
                  <button
                    key={item._id}
                    onClick={() => {
                      haptic("light");
                      onItemClick?.(item);
                    }}
                    className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate transition-colors ${
                      item.checked
                        ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 line-through"
                        : item.priority === "high"
                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        : item.priority === "medium"
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                        : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
                {dateSchedules.slice(0, 1).map((entry) => (
                  <div
                    key={entry._id}
                    className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded border flex items-center justify-between gap-1 ${
                      entry.enabled
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                    }`}
                    title={entry.cronExpr ? `${entry.title} (${entry.cronExpr})` : entry.title}
                  >
                    <span className="truncate">🕒 {entry.title}</span>
                    <button
                      onClick={() => void toggleScheduleEnabled(entry)}
                      disabled={pendingEntryId === entry._id}
                      className="text-[9px] px-1 py-0.5 rounded bg-white/70 dark:bg-black/20 border border-current/20"
                      title={entry.enabled ? "Disable schedule" : "Enable schedule"}
                    >
                      {pendingEntryId === entry._id ? "…" : entry.enabled ? "On" : "Off"}
                    </button>
                  </div>
                ))}
                {(dateItems.length + dateSchedules.length) > 3 && (
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 pl-1">
                    +{dateItems.length + dateSchedules.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showSchedules && scheduleEntries.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Schedule view</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {scheduleEntries.slice(0, 12).map((entry) => (
              <div key={entry._id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-gray-50 dark:bg-gray-900/40">
                <div className="truncate pr-2 text-gray-700 dark:text-gray-200">
                  {entry.title}{entry.cronExpr ? ` · ${entry.cronExpr}` : ""}
                </div>
                <button
                  onClick={() => void toggleScheduleEnabled(entry)}
                  disabled={pendingEntryId === entry._id}
                  className={`px-2 py-0.5 rounded border ${entry.enabled ? "text-green-700 border-green-300 dark:text-green-300 dark:border-green-700" : "text-gray-500 border-gray-300 dark:text-gray-300 dark:border-gray-700"}`}
                >
                  {pendingEntryId === entry._id ? "Saving" : entry.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
