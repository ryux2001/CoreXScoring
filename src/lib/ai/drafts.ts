import { redactSensitiveText } from "./privacy";
import type { AiSupabaseClient } from "./tools/types";
import { getDraftSaveState, type BuildDraft, type BuildDraftComponent, type BuildSlot, type ComboDraft, type ComboDraftComponent, type ComboSlot } from "./types";

type Row = Record<string, unknown>;

const BUILD_SLOTS: BuildSlot[] = ["cpu", "gpu", "ram", "motherboard", "storage", "psu"];
const COMBO_SLOTS: ComboSlot[] = ["cpu", "gpu", "ram"];

function asText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? redactSensitiveText(value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim()).slice(0, maxLength)
    : "";
}

function asPrice(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 1_000_000
    ? Number(value.toFixed(2))
    : undefined;
}

function getRowsById(data: unknown): Map<string, Row> {
  return new Map((Array.isArray(data) ? data : []).flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Row;
    return typeof row.id === "string" ? [[row.id, row] as const] : [];
  }));
}

function resolveComponent(
  source: Row,
  row: Row | undefined,
  slot: BuildSlot | ComboSlot,
): BuildDraftComponent | ComboDraftComponent | null {
  if (!row || asText(row.type, 40).toLowerCase() !== slot) return null;
  const priceMode = source.priceMode === "custom" || source.priceMode === "msrp" || source.priceMode === "catalog"
    ? source.priceMode
    : "catalog";
  const customPrice = asPrice(source.customPrice);
  return {
    id: asText(row.id, 120),
    name: asText(row.name, 200),
    type: slot,
    query: asText(source.query, 120),
    priceMode: priceMode === "custom" && customPrice === undefined ? "catalog" : priceMode,
    ...(customPrice !== undefined ? { customPrice } : {}),
    ...(source.owned === true ? { owned: true } : {}),
  } as BuildDraftComponent | ComboDraftComponent;
}

function resolveTitle(value: unknown): string | undefined {
  const title = asText(value, 80);
  return title || undefined;
}

function resolveCategory(value: unknown): string | undefined {
  const category = asText(value, 60);
  return category || undefined;
}

export async function resolveServerDrafts(
  supabase: AiSupabaseClient,
  buildDraft?: BuildDraft,
  comboDraft?: ComboDraft,
): Promise<{ buildDraft?: BuildDraft; comboDraft?: ComboDraft }> {
  const drafts = [buildDraft, comboDraft].filter(Boolean) as Array<BuildDraft | ComboDraft>;
  if (drafts.length === 0) return {};

  const requestedIds = [...new Set(drafts.flatMap((draft) => Object.values(draft.components).map((component) => component.id)))];
  if (requestedIds.length === 0 || requestedIds.length > 6) return {};

  const { data, error } = await supabase
    .from("products")
    .select("id,name,type")
    .in("id", requestedIds);
  if (error) return {};
  const rowsById = getRowsById(data);
  const resolved: { buildDraft?: BuildDraft; comboDraft?: ComboDraft } = {};

  if (buildDraft) {
    const components = Object.fromEntries(BUILD_SLOTS.map((slot) => [
      slot,
      resolveComponent(buildDraft.components[slot] as unknown as Row, rowsById.get(buildDraft.components[slot].id), slot),
    ]));
    if (BUILD_SLOTS.every((slot) => components[slot])) {
      resolved.buildDraft = {
        ...(resolveTitle(buildDraft.title) ? { title: resolveTitle(buildDraft.title) } : {}),
        ...(buildDraft.awaitingTitle === true ? { awaitingTitle: true } : {}),
        ...(buildDraft.awaitingSaveConfirmation === true ? { awaitingSaveConfirmation: true } : {}),
        saveState: getDraftSaveState(buildDraft),
        ...(resolveCategory(buildDraft.category) ? { category: resolveCategory(buildDraft.category) } : {}),
        currency: buildDraft.currency === "EUR" ? "EUR" : "USD",
        components: components as Record<BuildSlot, BuildDraftComponent>,
      };
    }
  }

  if (comboDraft) {
    const components = Object.fromEntries(COMBO_SLOTS.map((slot) => [
      slot,
      resolveComponent(comboDraft.components[slot] as unknown as Row, rowsById.get(comboDraft.components[slot].id), slot),
    ]));
    if (COMBO_SLOTS.every((slot) => components[slot])) {
      resolved.comboDraft = {
        ...(resolveTitle(comboDraft.title) ? { title: resolveTitle(comboDraft.title) } : {}),
        ...(comboDraft.awaitingTitle === true ? { awaitingTitle: true } : {}),
        ...(comboDraft.awaitingSaveConfirmation === true ? { awaitingSaveConfirmation: true } : {}),
        saveState: getDraftSaveState(comboDraft),
        ...(resolveCategory(comboDraft.category) ? { category: resolveCategory(comboDraft.category) } : {}),
        currency: comboDraft.currency === "EUR" ? "EUR" : "USD",
        components: components as Record<ComboSlot, ComboDraftComponent>,
      };
    }
  }

  return resolved;
}
