import { Html5QrcodeSupportedFormats } from 'html5-qrcode';

/**
 * Ubicaciones centralizadas del sistema.
 * Se reutilizan en el filtro de escaneo, inventario, creación/edición y auditoría.
 */
export const PRODUCT_LOCATIONS = [
  'Oficina',
  'Recepción',
  'Tienda',
  'Almacén',
] as const;

export type ProductLocation = (typeof PRODUCT_LOCATIONS)[number];

export const DEFAULT_PRODUCT_LOCATION: ProductLocation = 'Tienda';

export function isValidProductLocation(value: unknown): value is ProductLocation {
  return (
    typeof value === 'string' &&
    (PRODUCT_LOCATIONS as readonly string[]).includes(value)
  );
}

export interface AppConfig {
  /** Activa o desactiva el pitido suave al leer un código de barras */
  SOUND_ENABLED: boolean;
  /** Activa o desactiva la vibración háptica en dispositivos móviles compatibles */
  VIBRATION_ENABLED: boolean;
  /** Stock mínimo por defecto al dar de alta nuevos productos */
  DEFAULT_STOCK_MIN: number;
  /** Ubicación por defecto para productos nuevos o sin asignar */
  DEFAULT_LOCATION: ProductLocation;
  /** Tiempo de espera (ms) entre lecturas consecutivas para evitar duplicados accidentales */
  SCAN_COOLDOWN_MS: number;
  /** FPS del escáner de cámara */
  SCANNER_FPS: number;
  /** Formatos de código de barras comerciales permitidos */
  ALLOWED_BARCODE_FORMATS: Html5QrcodeSupportedFormats[];
}

export const appConfig: AppConfig = {
  SOUND_ENABLED: true,
  VIBRATION_ENABLED: true,
  DEFAULT_STOCK_MIN: 5,
  DEFAULT_LOCATION: DEFAULT_PRODUCT_LOCATION,
  SCAN_COOLDOWN_MS: 1400,
  SCANNER_FPS: 15,
  ALLOWED_BARCODE_FORMATS: [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.CODE_128,
  ],
};
