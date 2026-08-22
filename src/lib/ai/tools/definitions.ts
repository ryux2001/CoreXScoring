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
    description: "Obtiene la ruta actual de CoreXScoring para entender si el usuario está en catálogo, comparador, combo, build o bóveda. No lee cookies ni almacenamiento.",
    parameters: {
      type: "object",
      properties: {},
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
  RECOMMEND_COMPONENTS_TOOL,
  GET_CURRENT_PAGE_CONTEXT_TOOL,
];
