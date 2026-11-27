import { CONTACT } from "./config";

/** wa.me deep link with a prefilled message. */
export function waLink(message: string): string {
  return `https://wa.me/${CONTACT.phone}?text=${encodeURIComponent(message)}`;
}

export const telLink = `tel:${CONTACT.phoneTel}`;
export const mailLink = `mailto:${CONTACT.email}`;
