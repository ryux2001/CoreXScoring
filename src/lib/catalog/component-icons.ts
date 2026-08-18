const MINI_ICON_PATH = "/images/mini icons/";

const componentIcons: Record<string, string> = {
  cpu: `${MINI_ICON_PATH}mini-cpu.webp`,
  gpu: `${MINI_ICON_PATH}mini-gpu.webp`,
  ram: `${MINI_ICON_PATH}mini-ram.webp`,
  motherboard: `${MINI_ICON_PATH}mini-mb.webp`,
  storage: `${MINI_ICON_PATH}mini-storage.webp`,
  psu: `${MINI_ICON_PATH}mini-psu.webp`,
};

export function getComponentIcon(componentType: string): string | null {
  return componentIcons[componentType.trim().toLowerCase()] ?? null;
}
