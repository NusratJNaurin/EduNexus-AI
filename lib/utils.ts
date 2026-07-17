import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Detects whether a given text string contains a significant amount of Arabic script.
 * Uses a heuristic threshold: if more than 30% of the non-whitespace characters
 * fall within Arabic Unicode ranges, the text is considered Arabic.
 *
 * Arabic Unicode ranges checked:
 *   U+0600–U+06FF   (Arabic)
 *   U+0750–U+077F   (Arabic Supplement)
 *   U+08A0–U+08FF   (Arabic Extended-A)
 *   U+FB50–U+FDFF   (Arabic Presentation Forms-A)
 *   U+FE70–U+FEFF   (Arabic Presentation Forms-B)
 *
 * This is a lightweight heuristic — no external API call needed.
 * The 30% threshold prevents false positives from documents that contain
 * only a few Arabic citations or references in an otherwise English text.
 */
export function isArabicText(text: string): boolean {
  if (!text || text.trim().length === 0) return false

  // Arabic Unicode range regex
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

  // Count Arabic characters vs total non-whitespace characters
  const nonWhitespaceChars = text.replace(/\s/g, "")
  if (nonWhitespaceChars.length === 0) return false

  let arabicCount = 0
  for (const char of nonWhitespaceChars) {
    if (arabicRegex.test(char)) {
      arabicCount++
    }
  }

  // If more than 30% of non-whitespace characters are Arabic, consider it Arabic text
  return arabicCount / nonWhitespaceChars.length > 0.3
}