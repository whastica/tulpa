const MESES_CORTO = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

export function formatMoneda(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
}

export function formatFecha(fecha: string): string {
  const [year, month, day] = fecha.split('-').map(Number);
  return `${day} ${MESES_CORTO[(month ?? 1) - 1]} ${year}`;
}

export function formatPorcentaje(valor: number): string {
  return `${(valor * 100).toFixed(1)}%`;
}