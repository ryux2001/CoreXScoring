/**
 * MOTHERBOARD CONNECTIVITY SCORE CALCULATOR
 */

import { MOTHERBOARD_CONFIG } from '../../config/motherboard';
import {
  finiteNumber,
  getSpecs,
  getTechnologyText,
  getUsbCounts,
  interpolate,
  score10,
} from './normalization';

export const calculateConnectivityScore = (product: any): number => {
  const specs = getSpecs(product);
  const wifi = String(specs.wifi ?? '').toLowerCase();
  const wifiScore = wifi.includes('7') ? 10 : wifi.includes('6e') ? 8.5 : wifi.includes('6') ? 7 : wifi.includes('5') ? 4.5 : wifi === 'no' ? 0 : 3.5;

  const ethernet = String(specs.ethernet ?? '').toLowerCase();
  let lanScore = ethernet.includes('10gb')
    ? 10
    : ethernet.includes('2.5gb')
      ? 7
      : ethernet.includes('5gb')
        ? 8.5
        : ethernet.includes('1gb') || ethernet.includes('gigabit') || ethernet.includes('gbps')
          ? 4
          : 3.5;
  if (ethernet.includes('dual') || ethernet.includes('+')) lanScore = Math.min(10, lanScore + 1);

  const { usb2, usb3, usbC } = getUsbCounts(product);
  const usbUnits = usbC * 1.6 + usb3 * 0.75 + usb2 * 0.2;
  const usbScore = interpolate(usbUnits, MOTHERBOARD_CONFIG.CONECTIVIDAD.USB_ANCHORS);
  const technologyText = getTechnologyText(product);
  const advancedIoScore = technologyText.includes('usb4') || technologyText.includes('thunderbolt')
    ? 10
    : usbC >= 3
      ? 8.5
      : usbC === 2
        ? 7
        : usbC === 1
          ? 5
          : 2;
  const weights = MOTHERBOARD_CONFIG.CONECTIVIDAD.WEIGHTS;

  // finiteNumber is intentionally used on the aggregate as a final guard for
  // malformed JSONB values without changing the explicit "No" Wi-Fi behavior.
  return score10(finiteNumber(
    wifiScore * weights.WIFI +
      lanScore * weights.LAN +
      usbScore * weights.USB +
      advancedIoScore * weights.ADVANCED_IO,
    0,
  ));
};
