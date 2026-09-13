import { afterEach, describe, expect, it, vi } from "vitest";
import { planBuild, planCombo, saveBuildDraft, saveComboDraft, updateBuildPlan } from "@/lib/ai/actions";
import { createQueryBuilder } from "./helpers/query-builder";

const buildProducts = [
  {
    id: "cpu-1", name: "AMD Ryzen 7 7800X3D", brand: "AMD", slug: "ryzen-7-7800x3d", type: "cpu",
    price_base_usd: 399, price_base_eur: 379, specs: {}, compatibility: { socket: "AM5", ram_type: "DDR5", ram_max_support: 128 },
  },
  {
    id: "gpu-1", name: "NVIDIA GeForce RTX 5070 Ti", brand: "NVIDIA", slug: "rtx-5070-ti", type: "gpu",
    price_base_usd: 749, price_base_eur: 699, specs: {}, compatibility: {},
  },
  {
    id: "ram-1", name: "Kingston 32GB DDR5", brand: "Kingston", slug: "kingston-32gb-ddr5", type: "ram",
    price_base_usd: 110, price_base_eur: 105, specs: { capacity: 32, memory_type: "DDR5" }, compatibility: {},
  },
  {
    id: "board-1", name: "MSI B650 AM5", brand: "MSI", slug: "msi-b650-am5", type: "motherboard",
    price_base_usd: 180, price_base_eur: 170, specs: {}, compatibility: { socket: "AM5", ram_type: "DDR5", ram_max_capacity: 128 },
  },
  {
    id: "storage-1", name: "Samsung 1TB NVMe", brand: "Samsung", slug: "samsung-1tb-nvme", type: "storage",
    price_base_usd: 80, price_base_eur: 75, specs: {}, compatibility: {},
  },
  {
    id: "psu-1", name: "Corsair 750W Gold", brand: "Corsair", slug: "corsair-750w-gold", type: "psu",
    price_base_usd: 100, price_base_eur: 95, specs: {}, compatibility: {},
  },
];

function createCatalogContext() {
  const priorityBuilder = createQueryBuilder({ data: buildProducts, error: null });
  const productBuilder = createQueryBuilder(
    { data: buildProducts, error: null },
    (ids) => ({ data: buildProducts.filter((product) => ids.includes(product.id)), error: null }),
  );
  return {
    supabase: {
      from: vi.fn((table: string) => table === "products" ? productBuilder : priorityBuilder),
      rpc: vi.fn(async () => ({ data: { id: "pending-1" }, error: null })),
      builder: priorityBuilder,
    },
    actionSupabase: {
      from: vi.fn((table: string) => table === "products" ? productBuilder : priorityBuilder),
      rpc: vi.fn(async () => ({ data: { id: "pending-1" }, error: null })),
      builder: priorityBuilder,
    },
    actor: { id: "user-1", isAnonymous: false },
    requestId: "11111111-1111-4111-8111-111111111111",
  };
}

const buildRequirements = {
  cpu: { query: "AMD Ryzen 7 7800X3D" },
  gpu: { query: "NVIDIA GeForce RTX 5070 Ti" },
  ram: { query: "Kingston 32GB DDR5" },
  motherboard: { query: "MSI B650 AM5" },
  storage: { query: "Samsung 1TB NVMe" },
  psu: { query: "Corsair 750W Gold" },
};

const comboRequirements = {
  cpu: { query: "AMD Ryzen 7 7800X3D" },
  gpu: { query: "NVIDIA GeForce RTX 5070 Ti" },
  ram: { query: "Kingston 32GB DDR5" },
};

describe("build and combo conversational flows", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("plans a compatible build without writing", async () => {
    const context = createCatalogContext();
    const result = await planBuild({ components: buildRequirements, currency: "EUR" }, context as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.buildDraft?.components.gpu.id).toBe("gpu-1");
      expect(result.buildDraft?.components.cpu.id).toBe("cpu-1");
    }
    expect(context.supabase.rpc).not.toHaveBeenCalled();
  });

  it("updates only the requested build slot", async () => {
    const context = createCatalogContext();
    const planned = await planBuild({ components: buildRequirements }, context as never);
    if (!planned.ok || !planned.buildDraft) throw new Error("Fixture de build no válida");

    const updated = await updateBuildPlan({ changes: { gpu: { query: "NVIDIA GeForce RTX 5070 Ti" } } }, {
      ...context,
      buildDraft: planned.buildDraft,
    } as never);

    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.buildDraft?.components.cpu.id).toBe(planned.buildDraft.components.cpu.id);
      expect(updated.buildDraft?.components.motherboard.id).toBe(planned.buildDraft.components.motherboard.id);
      expect(updated.buildDraft?.components.gpu.id).toBe("gpu-1");
    }
  });

  it("creates a pending build proposal only after an explicit title", async () => {
    vi.stubEnv("AI_ACTION_SECRET", "a".repeat(32));
    const context = createCatalogContext();
    const planned = await planBuild({ components: buildRequirements }, context as never);
    if (!planned.ok || !planned.buildDraft) throw new Error("Fixture de build no válida");

    const pending = await saveBuildDraft({ title: "Build Gaming 1440p" }, {
      ...context,
      buildDraft: planned.buildDraft,
    } as never);

    expect(pending.ok).toBe(true);
    if (pending.ok) expect(pending.pendingAction?.type).toBe("create_build");
    expect(context.actionSupabase.rpc).toHaveBeenCalledWith("create_ai_pending_action_server", expect.any(Object));
  });

  it("plans and prepares a combo without saving it automatically", async () => {
    vi.stubEnv("AI_ACTION_SECRET", "a".repeat(32));
    const context = createCatalogContext();
    const planned = await planCombo({ components: comboRequirements, currency: "EUR" }, context as never);
    expect(planned.ok).toBe(true);
    if (!planned.ok || !planned.comboDraft) throw new Error("Fixture de combo no válida");

    const pending = await saveComboDraft({ title: "Combo Gaming" }, {
      ...context,
      comboDraft: planned.comboDraft,
    } as never);

    expect(pending.ok).toBe(true);
    if (pending.ok) expect(pending.pendingAction?.type).toBe("create_combo");
    expect(context.actionSupabase.rpc).toHaveBeenCalledTimes(1);
  });

  it("asks for a title instead of inventing one", async () => {
    const context = createCatalogContext();
    const planned = await planCombo({ components: comboRequirements }, context as never);
    if (!planned.ok || !planned.comboDraft) throw new Error("Fixture de combo no válida");

    const pending = await saveComboDraft({}, { ...context, comboDraft: planned.comboDraft } as never);
    expect(pending.ok).toBe(true);
    if (pending.ok) {
      expect(pending.comboDraft?.awaitingTitle).toBe(true);
      expect(pending.data).toMatchObject({ status: "needs_title" });
    }
    expect(context.supabase.rpc).not.toHaveBeenCalled();
  });
});
