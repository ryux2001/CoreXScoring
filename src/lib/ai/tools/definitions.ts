export interface AiToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** Tool de lectura: busca componentes públicos del catálogo por texto y filtros. */
const SEARCH_COMPONENTS_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "search_components",
    description: "Busca componentes públicos del catálogo de CoreXScoring. Usa esta tool antes de recomendar o comparar productos si el usuario no ha dado IDs exactos.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Nombre, marca o modelo que se quiere buscar." },
        type: {
          type: "string",
          enum: ["cpu", "gpu", "ram", "storage", "motherboard", "psu"],
          description: "Tipo de componente opcional.",
        },
        minPriceUsd: { type: "number", minimum: 0, description: "Precio base mínimo en USD." },
        maxPriceUsd: { type: "number", minimum: 0, description: "Precio base máximo en USD." },
        limit: { type: "integer", minimum: 1, maximum: 8, description: "Máximo de resultados, entre 1 y 8." },
      },
      additionalProperties: false,
    },
  },
};

/** Tool de lectura: obtiene el detalle y el scoring de un componente concreto. */
const GET_COMPONENT_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "get_component",
    description: "Obtiene un componente público por id, slug o nombre y devuelve sus datos estructurados, métricas y notas calculadas.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID exacto del componente." },
        slug: { type: "string", description: "Slug exacto del componente." },
        name: { type: "string", description: "Nombre del componente si no se conoce el id o slug." },
      },
      additionalProperties: false,
    },
  },
};

/** Tool de lectura: compara hasta cuatro componentes mediante datos y scoring internos. */
const COMPARE_COMPONENTS_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "compare_components",
    description: "Compara hasta cuatro componentes ya identificados por sus IDs. Devuelve precios, notas, métricas y un ranking calculado; no inventa datos faltantes.",
    parameters: {
      type: "object",
      properties: {
        componentIds: {
          type: "array",
          minItems: 2,
          maxItems: 4,
          items: { type: "string" },
          description: "IDs exactos obtenidos del catálogo.",
        },
        currency: { type: "string", enum: ["USD", "EUR"], description: "Moneda de presentación. Por defecto USD." },
      },
      required: ["componentIds"],
      additionalProperties: false,
    },
  },
};

/** Tool de lectura: busca combos públicos activos y resume sus piezas y scoring. */
const SEARCH_COMBOS_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "search_combos",
    description: "Busca combos públicos activos por título, categoría o slug y devuelve sus componentes y notas calculadas.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Texto opcional para título o slug." },
        limit: { type: "integer", minimum: 1, maximum: 6, description: "Máximo de resultados, entre 1 y 6." },
      },
      additionalProperties: false,
    },
  },
};

/** Tool de lectura: obtiene un combo completo por id o slug. */
const GET_COMBO_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "get_combo",
    description: "Obtiene un combo público por id o slug, sus tres componentes y las notas calculadas de CoreXScoring.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID exacto del combo." },
        slug: { type: "string", description: "Slug exacto del combo." },
        currency: { type: "string", enum: ["USD", "EUR"], description: "Moneda de presentación. Por defecto USD." },
      },
      additionalProperties: false,
    },
  },
};

/** Tool de lectura: busca builds públicas activas y resume sus piezas y scoring. */
const SEARCH_BUILDS_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "search_builds",
    description: "Busca builds públicas activas por título, categoría o slug y devuelve sus piezas y notas calculadas.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Texto opcional para título, categoría o slug." },
        limit: { type: "integer", minimum: 1, maximum: 6, description: "Máximo de resultados, entre 1 y 6." },
      },
      additionalProperties: false,
    },
  },
};

/** Tool de lectura: obtiene una build completa por id o slug. */
const GET_BUILD_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "get_build",
    description: "Obtiene una build pública activa por id o slug, sus componentes, compatibilidad y notas calculadas.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID exacto de la build." },
        slug: { type: "string", description: "Slug exacto de la build." },
        currency: { type: "string", enum: ["USD", "EUR"], description: "Moneda de presentación. Por defecto USD." },
      },
      additionalProperties: false,
    },
  },
};

const ANALYZE_BUILD_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "analyze_build",
    description: "Obtiene una build pública por id o slug en una sola tool y devuelve componentes, precios, compatibilidad y scoring para explicar qué modificarías. Es de solo lectura y nunca guarda cambios.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID exacto de la build." },
        slug: { type: "string", description: "Slug exacto de la build." },
        currency: { type: "string", enum: ["USD", "EUR"], description: "Moneda de presentación." },
      },
      additionalProperties: false,
    },
  },
};

/** Tool de lectura: propone candidatos ordenados por scoring existente y presupuesto opcional. */
const RECOMMEND_COMPONENTS_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "recommend_components",
    description: "Genera candidatos de recomendación usando productos reales y el scoring de CoreXScoring. Devuelve candidatos, no realiza compras ni cambios.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["cpu", "gpu", "ram", "storage", "motherboard", "psu"],
          description: "Tipo de componente requerido.",
        },
        useCase: {
          type: "string",
          enum: ["gaming", "productivity", "balanced"],
          description: "Uso principal para ordenar candidatos.",
        },
        maxPriceUsd: { type: "number", minimum: 0, description: "Presupuesto máximo por componente en USD." },
        limit: { type: "integer", minimum: 1, maximum: 5, description: "Máximo de candidatos, entre 1 y 5." },
      },
      required: ["type"],
      additionalProperties: false,
    },
  },
};

/** Tool de contexto: devuelve únicamente la ruta y metadatos no sensibles enviados por la interfaz. */
const GET_CURRENT_PAGE_CONTEXT_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "get_current_page_context",
    description: "Obtiene el contexto actual validado de CoreXScoring: sección, entidad visible, título y componentes de la página. No lee cookies ni almacenamiento.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
};

const SET_CURRENT_CATALOG_PRICE_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "set_current_catalog_price",
    description: "Aplica un precio únicamente a la evaluación local del componente que el usuario está viendo. Úsala solo cuando el usuario ordene explícitamente cambiar, evaluar o aplicar un precio; no modifica el catálogo ni la base de datos.",
    parameters: {
      type: "object",
      properties: {
        price: { type: "number", minimum: 0.01, maximum: 1_000_000, description: "Nuevo precio a evaluar." },
        currency: { type: "string", enum: ["USD", "EUR"], description: "Moneda del nuevo precio." },
        valueProfile: { type: "string", enum: ["balanced", "gaming", "creation", "productivity"], description: "Perfil opcional para CPU o GPU." },
      },
      required: ["price"],
      additionalProperties: false,
    },
  },
};

/** Tools de lectura de la bóveda: solo disponibles para cuentas permanentes. */
const SEARCH_USER_COMBOS_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "search_user_combos",
    description: "Busca combos guardados por el usuario autenticado. No funciona para sesiones anónimas y nunca devuelve datos de otros usuarios.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Texto opcional del título del combo." },
      },
      additionalProperties: false,
    },
  },
};

const SEARCH_USER_BUILDS_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "search_user_builds",
    description: "Busca builds guardadas por el usuario autenticado. No funciona para sesiones anónimas y nunca devuelve datos de otros usuarios.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Texto opcional del título de la build." },
      },
      additionalProperties: false,
    },
  },
};

/** Tools de propuesta: generan una tarjeta pendiente, pero no escriben en Supabase. */
const PROPOSE_CREATE_COMBO_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "propose_create_combo",
    description: "Prepara una propuesta para guardar un combo en la bóveda del usuario. Requiere cuenta permanente, valida componentes reales y espera confirmación explícita; nunca guarda por sí sola.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Nombre del combo, máximo 80 caracteres." },
        componentIds: {
          type: "object",
          properties: {
            cpu: { type: "string" },
            gpu: { type: "string" },
            ram: { type: "string" },
          },
          required: ["cpu", "gpu", "ram"],
          additionalProperties: false,
        },
        customPrices: {
          type: "object",
          description: "Precios opcionales por slot, por ejemplo {cpu:{USD:300}}. Solo se guardan tras confirmar.",
          additionalProperties: true,
        },
      },
      required: ["title", "componentIds"],
      additionalProperties: false,
    },
  },
};

const PROPOSE_CREATE_BUILD_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "propose_create_build",
    description: "Prepara una propuesta para guardar una build completa en la bóveda del usuario. Requiere cuenta permanente, valida los seis componentes y espera confirmación explícita; nunca guarda por sí sola.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Nombre de la build, máximo 80 caracteres." },
        category: { type: "string", description: "Categoría opcional de la build." },
        componentIds: {
          type: "object",
          properties: {
            cpu: { type: "string" },
            gpu: { type: "string" },
            ram: { type: "string" },
            motherboard: { type: "string" },
            storage: { type: "string" },
            psu: { type: "string" },
          },
          required: ["cpu", "gpu", "ram", "motherboard", "storage", "psu"],
          additionalProperties: false,
        },
        customPrices: {
          type: "object",
          description: "Precios opcionales por slot, por ejemplo {cpu:{USD:500}}. Solo se guardan tras confirmar.",
          additionalProperties: true,
        },
      },
      required: ["title", "componentIds"],
      additionalProperties: false,
    },
  },
};

const PLAN_BUILD_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "plan_build",
    description: "Resuelve CPU, GPU, RAM, placa base, almacenamiento y PSU en una sola operación, valida compatibilidad y devuelve una recomendación en texto. No crea una propuesta ni guarda nada; el usuario puede pedir cambios antes de decidir si quiere guardarla.",
    parameters: {
      type: "object",
      properties: {
        currency: { type: "string", enum: ["USD", "EUR"], description: "Moneda de los precios personalizados." },
        components: {
          type: "object",
          properties: Object.fromEntries([
            ["cpu", "Procesador; por ejemplo Ryzen 5 5600."],
            ["gpu", "Tarjeta gráfica; por ejemplo RTX 5060."],
            ["ram", "Memoria RAM; por ejemplo Fury Beast 2x16."],
            ["motherboard", "Placa base; por ejemplo B550."],
            ["storage", "Almacenamiento; por ejemplo SSD 1TB."],
            ["psu", "Fuente de alimentación; por ejemplo XPG Pylon."],
          ].map(([slot, description]) => [slot, {
            type: "object",
            properties: {
              query: { type: "string", description },
              customPrice: { type: "number", minimum: 0.01, maximum: 1_000_000, description: "Precio personalizado opcional para este slot." },
              priceMode: { type: "string", enum: ["custom", "catalog", "msrp"], description: "custom usa customPrice; catalog/msrp usa el precio base real del catálogo." },
            },
            required: ["query"],
            additionalProperties: false,
          }])),
          required: ["cpu", "gpu", "ram", "motherboard", "storage", "psu"],
          additionalProperties: false,
        },
      },
      required: ["components"],
      additionalProperties: false,
    },
  },
};

const UPDATE_BUILD_PLAN_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "update_build_plan",
    description: "Modifica solo los slots que el usuario mencione en el borrador activo y conserva todos los demás componentes sin sustituirlos. No crea ni guarda nada.",
    parameters: {
      type: "object",
      properties: {
        changes: {
          type: "object",
          properties: Object.fromEntries([
            ["cpu", "Procesador nuevo."],
            ["gpu", "Tarjeta gráfica nueva."],
            ["ram", "Memoria RAM nueva."],
            ["motherboard", "Placa base nueva."],
            ["storage", "Almacenamiento nuevo."],
            ["psu", "Fuente nueva."],
          ].map(([slot, description]) => [slot, {
            type: "object",
            description,
            properties: {
              query: { type: "string", description: "Nombre o modelo; conserva números y variantes explícitas." },
              customPrice: { type: "number", minimum: 0.01, maximum: 1_000_000 },
              priceMode: { type: "string", enum: ["custom", "catalog", "msrp"] },
            },
            required: ["query"],
            additionalProperties: false,
          }])),
          additionalProperties: false,
        },
      },
      required: ["changes"],
      additionalProperties: false,
    },
  },
};

const SAVE_BUILD_DRAFT_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "save_build_draft",
    description: "Prepara la confirmación para guardar el borrador actual en la bóveda. Solo úsala cuando el usuario pida explícitamente guardarlo. El título debe venir del usuario; si falta, pregunta por él y no inventes ninguno.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título elegido explícitamente por el usuario, entre 3 y 80 caracteres." },
        category: { type: "string", description: "Categoría opcional de la build." },
      },
      additionalProperties: false,
    },
  },
};

const COMBO_COMPONENTS = Object.fromEntries([
  ["cpu", "Procesador; por ejemplo Ryzen 5 5600."],
  ["gpu", "Tarjeta gráfica; por ejemplo RTX 5060."],
  ["ram", "Memoria RAM; por ejemplo Fury Beast 2x16."],
].map(([slot, description]) => [slot, {
  type: "object",
  description,
  properties: {
    query: { type: "string", description: "Nombre o modelo; conserva números y variantes explícitas." },
    customPrice: { type: "number", minimum: 0.01, maximum: 1_000_000 },
    priceMode: { type: "string", enum: ["custom", "catalog", "msrp"] },
  },
  required: ["query"],
  additionalProperties: false,
}]));

const PLAN_COMBO_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "plan_combo",
    description: "Resuelve CPU, GPU y RAM, valida compatibilidad y devuelve una recomendación de combo en texto. No crea una propuesta ni guarda nada.",
    parameters: {
      type: "object",
      properties: {
        currency: { type: "string", enum: ["USD", "EUR"] },
        components: {
          type: "object",
          properties: COMBO_COMPONENTS,
          required: ["cpu", "gpu", "ram"],
          additionalProperties: false,
        },
      },
      required: ["components"],
      additionalProperties: false,
    },
  },
};

const UPDATE_COMBO_PLAN_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "update_combo_plan",
    description: "Modifica solo los slots del combo que el usuario mencione y conserva los demás componentes sin sustituirlos. No crea ni guarda nada.",
    parameters: {
      type: "object",
      properties: {
        changes: { type: "object", properties: COMBO_COMPONENTS, additionalProperties: false },
      },
      required: ["changes"],
      additionalProperties: false,
    },
  },
};

const SAVE_COMBO_DRAFT_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "save_combo_draft",
    description: "Prepara la confirmación para guardar el combo activo. Solo úsala si el usuario pide explícitamente guardarlo. El título debe venir del usuario; si falta, pregunta por él.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título elegido por el usuario, entre 3 y 80 caracteres." },
      },
      additionalProperties: false,
    },
  },
};

const FIND_EXTERNAL_PRICE_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "find_external_price",
    description: "Busca precios actuales de un componente en PcComponentes, Amazon, eBay o AliExpress. Es de solo lectura: devuelve candidatos, fuentes y confianza; nunca inserta ni modifica precios.",
    parameters: {
      type: "object",
      properties: {
        productQuery: { type: "string", description: "Nombre o modelo exacto del componente, por ejemplo Ryzen 5 5600." },
        componentId: { type: "string", description: "ID exacto del catálogo si ya está disponible; tiene prioridad sobre productQuery." },
        country: { type: "string", enum: ["ES"], description: "País de búsqueda. Actualmente solo se admite ES." },
        retailer: { type: "string", description: "Tienda opcional: PcComponentes, Amazon, eBay o AliExpress." },
        mode: { type: "string", enum: ["best_price", "specific_retailer"], description: "Busca entre todas las fuentes permitidas o en una tienda concreta." },
      },
      additionalProperties: false,
    },
  },
};

const PROPOSE_SET_CUSTOM_PRICE_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "propose_set_custom_price",
    description: "Prepara una propuesta para cambiar el precio personalizado de un combo o build propio. Requiere confirmación explícita y no modifica datos al proponer.",
    parameters: {
      type: "object",
      properties: {
        entityType: { type: "string", enum: ["combo", "build"] },
        entityId: { type: "string", description: "ID de la entidad propia." },
        slot: { type: "string", enum: ["cpu", "gpu", "ram", "motherboard", "storage", "psu"] },
        currency: { type: "string", enum: ["USD", "EUR"] },
        price: { type: "number", minimum: 0.01, maximum: 1000000 },
      },
      required: ["entityType", "entityId", "slot", "currency", "price"],
      additionalProperties: false,
    },
  },
};

export const AI_TOOL_DEFINITIONS: AiToolDefinition[] = [
  SEARCH_COMPONENTS_TOOL,
  GET_COMPONENT_TOOL,
  COMPARE_COMPONENTS_TOOL,
  SEARCH_COMBOS_TOOL,
  GET_COMBO_TOOL,
  SEARCH_BUILDS_TOOL,
  GET_BUILD_TOOL,
  ANALYZE_BUILD_TOOL,
  RECOMMEND_COMPONENTS_TOOL,
  GET_CURRENT_PAGE_CONTEXT_TOOL,
  SET_CURRENT_CATALOG_PRICE_TOOL,
  SEARCH_USER_COMBOS_TOOL,
  SEARCH_USER_BUILDS_TOOL,
  PROPOSE_CREATE_COMBO_TOOL,
  PROPOSE_CREATE_BUILD_TOOL,
  PLAN_BUILD_TOOL,
  UPDATE_BUILD_PLAN_TOOL,
  SAVE_BUILD_DRAFT_TOOL,
  PLAN_COMBO_TOOL,
  UPDATE_COMBO_PLAN_TOOL,
  SAVE_COMBO_DRAFT_TOOL,
  FIND_EXTERNAL_PRICE_TOOL,
  PROPOSE_SET_CUSTOM_PRICE_TOOL,
];
