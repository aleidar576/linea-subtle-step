import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export const generateProductQuoteLink = (
  phone: string,
  productName: string,
  quantity: number,
  variationText?: string,
): string => {
  const variation = variationText ? ` (${variationText})` : "";
  const text = `Olá! Gostaria de solicitar um orçamento para:\n\n${quantity}x ${productName}${variation}\n\nAguardo retorno!`;
  return `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(text)}`;
};

export const generateCartQuoteLink = (
  phone: string,
  cartItems: Array<{ name: string; quantity: number; variation?: string }>,
): string => {
  const lines = cartItems
    .map((item) => {
      const variation = item.variation ? ` (${item.variation})` : "";
      return `- ${item.quantity}x ${item.name}${variation}`;
    })
    .join("\n");
  const text = `Olá! Gostaria de solicitar um orçamento para os seguintes itens:\n\n${lines}\n\nAguardo retorno!`;
  return `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(text)}`;
};
