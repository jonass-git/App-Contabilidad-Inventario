import { Html5QrcodeSupportedFormats } from 'html5-qrcode';

export interface AppConfig {
  /** Activa o desactiva el pitido suave al leer un código de barras */
  SOUND_ENABLED: boolean;
  /** Activa o desactiva la vibración háptica en dispositivos móviles compatibles */
  VIBRATION_ENABLED: boolean;
  /** Stock mínimo por defecto al dar de alta nuevos productos */
  DEFAULT_STOCK_MIN: number;
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
  SCAN_COOLDOWN_MS: 1400,
  SCANNER_FPS: 15,
  ALLOWED_BARCODE_FORMATS: [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.CODE_128,
  ],
};
