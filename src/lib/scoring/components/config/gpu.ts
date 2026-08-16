/**
 * Public GPU scoring configuration.
 *
 * The active calculators live in calculations/gpu. Keep this export as the
 * stable configuration entry point for callers that already import config
 * from components/config.
 */
export {
  GPU_CAPABILITY_PROFILES,
  GPU_SCORING_V3,
  type GpuArchitectureFamily,
  type GpuCapabilityProfile,
} from '../calculations/gpu/v3-config';
