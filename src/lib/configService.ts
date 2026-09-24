import { getAppConfig, getAllFeatureFlags, getPricingConfig } from './db';
import { AppConfig, FeatureFlag, PricingConfig } from '../types';

let cachedConfig: AppConfig | null = null;
let cachedFlags: FeatureFlag[] = [];
let cachedPricing: PricingConfig | null = null;
let lastFetched: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getAppConfigAndFlags() {
  const now = Date.now();
  if (cachedConfig && cachedPricing && now - lastFetched < CACHE_TTL) {
    return { config: cachedConfig, flags: cachedFlags, pricing: cachedPricing };
  }

  const [config, flags, pricing] = await Promise.all([getAppConfig(), getAllFeatureFlags(), getPricingConfig()]);
  cachedConfig = config;
  cachedFlags = flags;
  cachedPricing = pricing;
  lastFetched = now;
  return { config, flags, pricing };
}

export function isFeatureEnabled(flags: FeatureFlag[], featureId: string): boolean {
  const flag = flags.find((f) => f.id === featureId);
  return flag ? flag.enabled : true; // Default to true if flag not found
}
