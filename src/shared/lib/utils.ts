import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function applyMarkup(baseAmount: number, markupPercent: number): number {
  return Math.round(baseAmount * (1 + markupPercent / 100));
}
