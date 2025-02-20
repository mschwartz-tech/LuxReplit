import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function staticUrl(filename: string) {
  return `/static/${filename}`;
}

export function assetUrl(filename: string) {
  return `/static/assets/${filename}`;
}
