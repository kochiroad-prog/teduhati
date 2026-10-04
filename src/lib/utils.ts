import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Stable pick from a list for a given day, so "today" means the same all day. */
export function pickForDay<T>(items: T[], seed: string, at: Date = new Date()): T | null {
  if (items.length === 0) return null;
  const key = `${seed}-${at.toISOString().slice(0, 10)}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return items[Math.abs(hash) % items.length];
}

export function pluralMinutes(n: number, word: string) {
  return `${n} ${word}`;
}
