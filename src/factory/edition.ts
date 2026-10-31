/** Build-time edition switch. `VITE_EDITION=factory npm run build` gives the simplified factory demo; anything else is the main app. */
export const FACTORY = (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_EDITION === 'factory';
export const BRAND = FACTORY ? 'Shakti OS' : 'Aarohan OS';
