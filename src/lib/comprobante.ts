const EXTENSIONES = ['jpg', 'jpeg', 'png', 'webp'];
const MIME_VALIDOS = ['image/jpeg', 'image/png', 'image/webp'];

export const COMPROBANTE_ACCEPT = MIME_VALIDOS.join(',');

export function esComprobanteValido(valor: string): boolean {
  if (!valor) return false;

  if (valor.startsWith('data:image/')) {
    const mime = valor.split(';')[0]?.split(':')[1] ?? '';
    return MIME_VALIDOS.includes(mime);
  }

  try {
    const url = new URL(valor);
    const pathname = url.pathname.toLowerCase();
    return EXTENSIONES.some((ext) => pathname.endsWith(`.${ext}`));
  } catch {
    return false;
  }
}

export function archivoAComprobante(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!MIME_VALIDOS.includes(file.type)) {
      reject(new Error('Formato no soportado. Usa JPG, PNG o WebP.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}
