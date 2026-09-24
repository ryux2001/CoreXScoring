import { afterEach, describe, expect, it, vi } from "vitest";
import { planBuild, planCombo, saveBuildDraft, saveComboDraft, updateBuildPlan } from "@/lib/ai/actions";
import { mergeRecommendationState } from "@/lib/ai/recommendation-state";
import { createQueryBuilder } from "./helpers/query-builder";

type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  slug: string;
  type: string;
  price_base_usd: number;
  price_base_eur: number;
  specs: Record<string, unknown>;
  compatibility: Record<string, unknown>;
};

const buildProducts: CatalogProduct[] = [
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
    id: "ram-ddr4", name: "Kingston 32GB DDR4", brand: "Kingston", slug: "kingston-32gb-ddr4", type: "ram",
    price_base_usd: 70, price_base_eur: 65, specs: { capacity: 32, memory_type: "DDR4" }, compatibility: {},
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

function createCatalogContext(catalog: CatalogProduct[] = buildProducts) {
  const productBuilder = createQueryBuilder(
    { data: catalog, error: null },
    (ids) => ({ data: catalog.filter((product) => ids.includes(product.id)), error: null }),
  );
  const createPriorityBuilder = () => createQueryBuilder(
    { data: catalog, error: null },
    undefined,
    (column, value) => column === "type"
      ? { data: catalog.filter((product) => product.type === value), error: null }
      : { data: catalog, error: null },
  );
  const priorityBuilder = createPriorityBuilder();
  return {
    supabase: {
      from: vi.fn((table: string) => table === "products" ? productBuilder : createPriorityBuilder()),
      rpc: vi.fn(async () => ({ data: { id: "pending-1" }, error: null })),
      builder: priorityBuilder,
    },
    actionSupabase: {
      from: vi.fn((table: string) => table === "products" ? productBuilder : createPriorityBuilder()),
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

  it("plans a build from budget and usage criteria without component names", async () => {
    const context = createCatalogContext();
    const result = await planBuild({
      budget: 1_800,
      currency: "USD",
      useCase: "gaming",
      resolution: "1440p",
      priority: "value",
    }, context as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.buildDraft?.components.cpu.id).toBe("cpu-1");
      expect(result.buildDraft?.components.gpu.id).toBe("gpu-1");
      expect(result.data).toMatchObject({ criteria: { budget: 1_800, useCase: "gaming", resolution: "1440p", priority: "value" } });
    }
    expect(context.supabase.rpc).not.toHaveBeenCalled();
  });

  it("filters RAM candidates to the CPU memory generation", async () => {
    const context = createCatalogContext();
    const result = await planBuild({
      budget: 1_800,
      currency: "USD",
      useCase: "gaming",
      resolution: "1440p",
      priority: "value",
    }, context as never);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.buildDraft?.components.ram.id).toBe("ram-1");
  });

  it("uses the new-market generation rules and permits the 5% budget tolerance", async () => {
    const catalog = [
      { id: "cpu-new", name: "AMD Ryzen 5 7600", brand: "AMD", slug: "ryzen-5-7600", type: "cpu", price_base_usd: 220, price_base_eur: 210, specs: {}, compatibility: { socket: "AM5", ram_type: "DDR5" } },
      { id: "cpu-old", name: "AMD Ryzen 5 5600", brand: "AMD", slug: "ryzen-5-5600", type: "cpu", price_base_usd: 100, price_base_eur: 95, specs: {}, compatibility: { socket: "AM4", ram_type: "DDR4" } },
      { id: "gpu-new", name: "NVIDIA GeForce RTX 4060", brand: "NVIDIA", slug: "rtx-4060", type: "gpu", price_base_usd: 400, price_base_eur: 380, specs: {}, compatibility: {} },
      { id: "gpu-old", name: "NVIDIA GeForce RTX 3060", brand: "NVIDIA", slug: "rtx-3060", type: "gpu", price_base_usd: 180, price_base_eur: 170, specs: {}, compatibility: {} },
      { id: "ram-new", name: "Kingston 32GB DDR5", brand: "Kingston", slug: "kingston-32gb-ddr5", type: "ram", price_base_usd: 110, price_base_eur: 105, specs: { capacity: 32, memory_type: "DDR5" }, compatibility: {} },
      { id: "board-new", name: "MSI B650 AM5", brand: "MSI", slug: "msi-b650-am5", type: "motherboard", price_base_usd: 100, price_base_eur: 95, specs: {}, compatibility: { socket: "AM5", ram_type: "DDR5", ram_max_capacity: 128 } },
      { id: "storage-new", name: "Kingston 500GB NVMe", brand: "Kingston", slug: "kingston-500gb-nvme", type: "storage", price_base_usd: 40, price_base_eur: 38, specs: {}, compatibility: {} },
      { id: "psu-new", name: "Corsair 650W", brand: "Corsair", slug: "corsair-650w", type: "psu", price_base_usd: 60, price_base_eur: 57, specs: {}, compatibility: {} },
    ];
    const result = await planBuild({ budget: 900, currency: "USD", useCase: "gaming", resolution: "1080p", priority: "balanced", market: "new" }, createCatalogContext(catalog) as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.buildDraft?.components.cpu.id).toBe("cpu-new");
      expect(result.buildDraft?.components.gpu.id).toBe("gpu-new");
      expect(result.data).toMatchObject({ estimatedTotal: 930, budgetDifference: -30 });
      expect(result.data).toMatchObject({ message: expect.stringContaining("¿Quieres cambiar algún componente o procedemos") });
    }
  });

  it("allows older CPU and GPU generations in the used market", async () => {
    const catalog: CatalogProduct[] = [
      { id: "cpu-used", name: "AMD Ryzen 5 5600", brand: "AMD", slug: "ryzen-5-5600", type: "cpu", price_base_usd: 100, price_base_eur: 95, specs: {}, compatibility: { socket: "AM4", ram_type: "DDR4" } },
      { id: "gpu-used", name: "NVIDIA GeForce RTX 3060", brand: "NVIDIA", slug: "rtx-3060", type: "gpu", price_base_usd: 180, price_base_eur: 170, specs: {}, compatibility: {} },
      { id: "ram-used", name: "Kingston 32GB DDR4", brand: "Kingston", slug: "kingston-32gb-ddr4", type: "ram", price_base_usd: 70, price_base_eur: 65, specs: { capacity: 32, memory_type: "DDR4" }, compatibility: {} },
      { id: "board-used", name: "MSI B550 AM4", brand: "MSI", slug: "msi-b550-am4", type: "motherboard", price_base_usd: 80, price_base_eur: 75, specs: {}, compatibility: { socket: "AM4", ram_type: "DDR4", ram_max_capacity: 128 } },
      { id: "storage-used", name: "Kingston 500GB NVMe", brand: "Kingston", slug: "kingston-500gb-nvme", type: "storage", price_base_usd: 40, price_base_eur: 38, specs: {}, compatibility: {} },
      { id: "psu-used", name: "Corsair 650W", brand: "Corsair", slug: "corsair-650w", type: "psu", price_base_usd: 60, price_base_eur: 57, specs: {}, compatibility: {} },
    ];
    const result = await planBuild({ budget: 510, currency: "USD", useCase: "gaming", resolution: "1080p", priority: "value", market: "used" }, createCatalogContext(catalog) as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.buildDraft?.components.cpu.id).toBe("cpu-used");
      expect(result.buildDraft?.components.gpu.id).toBe("gpu-used");
    }
  });

  it("uses an accumulated required GPU and its custom price while planning", async () => {
    const context = createCatalogContext();
    const recommendationState = mergeRecommendationState(undefined, "build", {
      criteria: { budget: 1_600, currency: "USD", useCase: "gaming", resolution: "1440p" },
      components: { gpu: { query: "RTX 5070 Ti", role: "required", customPrice: 380, currency: "USD" } },
    });
    const result = await planBuild({}, { ...context, recommendationState } as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.buildDraft?.components.gpu.id).toBe("gpu-1");
      expect(result.data).toMatchObject({ estimatedTotal: 1_249, budgetDifference: 351 });
    }
    expect(context.supabase.rpc).not.toHaveBeenCalled();
  });

  it("plans a combo from accumulated criteria without manual component searches", async () => {
    const context = createCatalogContext();
    const recommendationState = mergeRecommendationState(undefined, "combo", {
      criteria: { budget: 1_600, currency: "USD", useCase: "gaming", resolution: "1080p", priority: "value" },
    });
    const result = await planCombo({}, { ...context, recommendationState } as never);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.comboDraft?.components.gpu.id).toBe("gpu-1");
    expect(context.supabase.rpc).not.toHaveBeenCalled();
  });

  it("filters combo RAM candidates to the CPU memory generation", async () => {
    const context = createCatalogContext();
    const recommendationState = mergeRecommendationState(undefined, "combo", {
      criteria: { budget: 1_600, currency: "USD", useCase: "gaming", resolution: "1080p", priority: "value" },
    });
    const result = await planCombo({}, { ...context, recommendationState } as never);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.comboDraft?.components.ram.id).toBe("ram-1");
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
    expect(context.actionSupabase.rpc).toHaveBeenCalledWith("create_ai_pending_action_server_v2", expect.any(Object));
  });

  it("asks for save confirmation after receiving a build title", async () => {
    const context = createCatalogContext();
    const planned = await planBuild({ components: buildRequirements }, context as never);
    if (!planned.ok || !planned.buildDraft) throw new Error("Fixture de build no válida");

    const prepared = await saveBuildDraft({ title: "1080p con Intel", prepareOnly: true }, {
      ...context,
      buildDraft: planned.buildDraft,
    } as never);

    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.pendingAction).toBeUndefined();
      expect(prepared.buildDraft).toMatchObject({ title: "1080p con Intel", awaitingTitle: false, awaitingSaveConfirmation: true, saveState: "awaiting_save_confirmation" });
      expect(prepared.data).toMatchObject({ status: "awaiting_save_confirmation", message: "¿Guardamos la build «1080p con Intel»?" });
    }
    expect(context.actionSupabase.rpc).not.toHaveBeenCalled();
  });

  it("creates the pending action after save confirmation", async () => {
    vi.stubEnv("AI_ACTION_SECRET", "a".repeat(32));
    const context = createCatalogContext();
    const planned = await planBuild({ components: buildRequirements }, context as never);
    if (!planned.ok || !planned.buildDraft) throw new Error("Fixture de build no válida");
    const prepared = await saveBuildDraft({ title: "1080p con Intel", prepareOnly: true }, { ...context, buildDraft: planned.buildDraft } as never);
    if (!prepared.ok || !prepared.buildDraft) throw new Error("No se preparó el título");

    const confirmed = await saveBuildDraft({ title: prepared.buildDraft.title }, { ...context, buildDraft: prepared.buildDraft } as never);

    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) expect(confirmed.pendingAction?.type).toBe("create_build");
    expect(context.actionSupabase.rpc).toHaveBeenCalledTimes(1);
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
