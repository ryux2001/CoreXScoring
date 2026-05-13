/**
 * MOTHERBOARD CONNECTIVITY SCORE CALCULATOR
 */

import { formatNoteScore } from '../../utils/helpers';
import { safeExtract } from '../../utils/validators';

export const calculateConnectivityScore = (product: any): number => {
  const specs = product?.specs || {};
  const usbPorts = specs?.usb_ports || {};
  
  return formatNoteScore(7.5);
};

