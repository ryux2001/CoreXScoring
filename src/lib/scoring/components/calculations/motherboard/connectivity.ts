/**
 * MOTHERBOARD CONNECTIVITY SCORE CALCULATOR
 */

import { MOTHERBOARD_CONFIG } from '../../config/motherboard';
import { formatNoteScore } from '../../../shared/helpers';

function parseJsonbString(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export const calculateConnectivityScore = (product: any): number => {
  const specs = parseJsonbString(product?.specs || '{}');
  const technologies = parseJsonbString(product?.technologies || '[]');
  
  const { WIFI, LAN, USB, TOTAL_POINTS } = MOTHERBOARD_CONFIG.CONECTIVIDAD;

  // 1. Red Inalámbrica (3000 pts)
  const wifiStr = (specs?.wifi || '').toLowerCase();
  let wifiPts = WIFI.NONE;
  if (wifiStr.includes('7')) wifiPts = WIFI.WIFI7;
  else if (wifiStr.includes('6e')) wifiPts = WIFI.WIFI6E;
  else if (wifiStr.includes('6')) wifiPts = WIFI.WIFI6;

  // 2. Red Cableada (3000 pts)
  const lanStr = (specs?.ethernet || '').toLowerCase();
  let lanPts = 0;
  
  // CORRECCIÓN: El orden de validación importa. 
  // Evaluamos '2.5gb' ANTES que '5gb' para evitar falsos positivos.
  if (lanStr.includes('10gb')) lanPts = LAN.LAN10G;
  else if (lanStr.includes('2.5gb')) lanPts = LAN.LAN2_5G;
  else if (lanStr.includes('5gb')) lanPts = LAN.LAN5G;
  else if (lanStr.includes('1gb') || lanStr.includes('gigabit')) lanPts = LAN.LAN1G;

  // 3. Puertos USB (4000 pts)
  const usbSpecs = specs?.usb_ports || {};
  const usbC = parseInt(usbSpecs?.usb_c || '0', 10);
  const usb3 = parseInt(usbSpecs?.usb_3 || '0', 10);
  const usb2 = parseInt(usbSpecs?.usb_2 || '0', 10);
  
  // Analizar si algún USB-C es Thunderbolt o USB4
  const techStr = (Array.isArray(technologies) ? technologies : [])
    .map((t: any) => `${t.name || ''} ${t.description || ''}`)
    .join(' ').toLowerCase();
  
  const hasThunderbolt = techStr.includes('thunderbolt') || techStr.includes('usb4');
  const usbC_Multiplier = hasThunderbolt ? USB.USB_C_THUNDERBOLT : USB.USB_C;

  let usbPts = (usbC * usbC_Multiplier) + (usb3 * USB.USB_3) + (usb2 * USB.USB_2);
  usbPts = Math.min(usbPts, USB.MAX_POINTS);

  const totalPoints = wifiPts + lanPts + usbPts;
  return formatNoteScore(Math.min(10, (totalPoints / TOTAL_POINTS) * 10));
};