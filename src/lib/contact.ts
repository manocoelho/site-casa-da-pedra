/** Monta um link "click to chat" do WhatsApp com mensagem pré-preenchida. */
export function buildWhatsAppUrl(phone: string, message?: string): string {
  const url = new URL(`https://wa.me/${phone.replace(/\D/g, "")}`);
  if (message) url.searchParams.set("text", message);
  return url.toString();
}

export function buildInstagramUrl(handle: string): string {
  return `https://instagram.com/${handle.replace(/^@/, "")}`;
}
