# Scoring architecture

The scoring system has three domains with the same high-level layout:

```text
components/  -> individual CPU, GPU, RAM, storage, motherboard and PSU notes
combos/      -> CPU + GPU + RAM notes
builds/      -> complete six-part build notes

Each domain contains:
  index.ts       public orchestrator and compatibility exports
  types.ts       input/output shapes
  config/        editable weights, ceilings and correction factors
  calculations/  small formula modules
```

`shared/` contains parsing and numeric helpers used by component formulas.
The compatibility files under the former `scoringCombos` and `scoringBuilds`
paths keep existing application imports working while the canonical code now
lives under this directory.

Build performance and value notes consume the visible component scoring notes.
Compatibility and upgradeability also inspect raw component specifications
because those two notes describe relationships between parts (socket, RAM
support, PCIe slots and PSU headroom) that no individual component note can
represent on its own. Their formulas and weights remain unchanged.

Combos and builds without every required component are considered incomplete
and return zeroed aggregate notes instead of evaluating partial data.

Manual configuration entry points:

- Components: `components/config/{cpu,gpu,ram,storage,motherboard,psu}.ts`
- Combos: `combos/config/weights.ts`
- Builds: `builds/config/weights.ts`

This phase intentionally preserves the existing arithmetic, calculation order,
rounding boundaries and output property names. Configuration values are moved
for readability only; changing them belongs to a later scoring-definition phase.
