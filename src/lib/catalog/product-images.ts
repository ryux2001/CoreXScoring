const CATALOG_IMAGE_PATH = "/images/catalog/";

type ProductImageInput = {
  type?: unknown;
  brand?: unknown;
  specs?: unknown;
};

function normalizedString(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getSpecValue(specs: unknown, key: string): string {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) return "";

  const value = (specs as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export function getProductImage({ type, brand, specs }: ProductImageInput): string | null {
  const normalizedType = normalizedString(type);
  const normalizedBrand = normalizedString(brand);

  if (normalizedType === "cpu") {
    if (normalizedBrand.includes("intel")) return `${CATALOG_IMAGE_PATH}processor-intel.webp`;
    if (normalizedBrand.includes("amd")) return `${CATALOG_IMAGE_PATH}processor-amd.webp`;
  }

  if (normalizedType === "gpu") {
    if (normalizedBrand.includes("nvidia")) return `${CATALOG_IMAGE_PATH}graphics_card-nvidia.webp`;
    if (normalizedBrand.includes("amd")) return `${CATALOG_IMAGE_PATH}graphics_card-amd.webp`;
    if (normalizedBrand.includes("intel")) return `${CATALOG_IMAGE_PATH}graphics_card-intel.webp`;
  }

  if (normalizedType === "ram") {
    const technology = normalizedString(
      getSpecValue(specs, "technology") || getSpecValue(specs, "memory_type"),
    );

    if (technology.includes("ddr4")) return `${CATALOG_IMAGE_PATH}ram-ddr4.webp`;
    if (technology.includes("ddr5")) return `${CATALOG_IMAGE_PATH}ram-ddr5.webp`;
  }

  if (normalizedType === "motherboard") return `${CATALOG_IMAGE_PATH}mb-generic.webp`;
  if (normalizedType === "storage") return `${CATALOG_IMAGE_PATH}storage-generic.webp`;
  if (normalizedType === "psu") return `${CATALOG_IMAGE_PATH}psu-generic.webp`;

  return null;
}
