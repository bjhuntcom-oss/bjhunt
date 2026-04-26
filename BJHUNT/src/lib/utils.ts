/**
 * cn — conditional class joiner. No dep on clsx so the atoms compile standalone.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
