// One rule for "which vehicle picture belongs to this driver". Same logic on the backend,
// the client and the driver app, so all three always show the same vehicle.
//   b = black, bl = blue, r = red, g = gray, w = white
export type VehicleLike = {
  type?: string; color?: string; brand?: string; cargoType?: string; refrigerationType?: string;
  pricingCategory?: string[] | string; vehicleCategory?: string[] | string;
} | null | undefined;

const lowerList = (x: unknown): string[] =>
  (Array.isArray(x) ? x : typeof x === 'string' && x ? [x] : []).map((s) => String(s).toLowerCase().trim());

export function normalizeVehicleColor(color?: string): 'b' | 'bl' | 'r' | 'g' | 'w' {
  const c = String(color || '').toLowerCase().trim();
  if (!c) return 'b';
  if (c === 'b' || c === 'bl' || c === 'r' || c === 'g' || c === 'w') return c;
  if (c.includes('blue') || c.includes('navy')) return 'bl';
  if (c.includes('red') || c.includes('burgundy')) return 'r';
  if (c.includes('white') || c.includes('beige')) return 'w';
  if (c.includes('gray') || c.includes('grey') || c.includes('silver')) return 'g';
  return 'b';
}

const VARIANTS: Record<string, string[]> = {
  bicycle: ['b', 'bl', 'r'],
  motorbike: ['b', 'bl', 'r'],
  bus: ['b', 'bl', 'g', 'w'],
  car: ['b', 'bl', 'g', 'r', 'w'],
  closed: ['b', 'bl', 'g', 'r', 'w'],
  open: ['b', 'bl', 'g', 'r', 'w'],
  truck: ['b', 'bl', 'g', 'r', 'w'], // refrigerated
};

/** Returns the picture name, e.g. "abicyclebl" (blue bicycle) or "acarg" (gray car). */
export function resolveVehicleIconName(v: VehicleLike): string {
  const type = String(v?.type || '').toLowerCase().trim();
  const cats = [...lowerList(v?.pricingCategory), ...lowerList(v?.vehicleCategory)];
  const has = (s: string) => cats.some((c) => c.includes(s));
  let base = 'car';
  if (type === 'bicycle' || type === 'cyclist' || has('bicycle')) base = 'bicycle';
  else if (type === 'motorbike' || type === 'motorcycle' || has('motorbike')) base = 'motorbike';
  else if (type === 'minibus' || type === 'bus' || has('xxl') || cats.includes('bus')) base = 'bus';
  else if (type === 'truck' || has('truck')) {
    const refrigerated = String(v?.refrigerationType || '').toLowerCase() === 'refrigerated' || has('refrigerated');
    const open = String(v?.cargoType || '').toLowerCase() === 'open' || has('open_truck');
    base = refrigerated ? 'truck' : open ? 'open' : 'closed';
  } else if (has('aletwende')) return 'aletwende1';
  else if (String(v?.brand || '').toLowerCase() === 'women') return 'acarg'; // women-only cars: gray car
  const col = normalizeVehicleColor(v?.color);
  const variant = VARIANTS[base].includes(col) ? col : 'b';
  return `a${base}${variant}`;
}
