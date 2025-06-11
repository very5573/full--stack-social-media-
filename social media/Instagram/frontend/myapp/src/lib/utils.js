// src/lib/utils.js

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind class name helper
 * Example: cn("p-2", condition && "bg-blue-500", "p-4") => "p-4 bg-blue-500"
 */
export function cn(...inputs) {
  return twMerge(clsx(...inputs));
}

/**
 * Converts a File object to a base64 data URL
 * Useful for image previews before uploading
 */
export const readFileAsDataURL = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      }
    };
    reader.readAsDataURL(file);
  });
};
