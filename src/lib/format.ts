const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** Formata um valor em reais. Ex.: 320 → "R$ 320". */
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** "1 hóspede" / "4 hóspedes". */
export function formatGuests(count: number): string {
  return `${count} ${count === 1 ? "hóspede" : "hóspedes"}`;
}
