// Tiny polyfills so the app also runs on old Android WebViews (e.g. Huawei P40 lite without Google services).
// Must be imported FIRST in app/_layout.tsx.
const g: any = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

if (!(Object as any).hasOwn) {
  (Object as any).hasOwn = (o: object, k: PropertyKey) => Object.prototype.hasOwnProperty.call(o, k);
}
if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, 'at', {
    value: function (this: any[], n: number) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; return n < 0 || n >= this.length ? undefined : this[n]; },
    configurable: true, writable: true,
  });
}
if (!(String.prototype as any).replaceAll) {
  Object.defineProperty(String.prototype, 'replaceAll', {
    value: function (this: string, search: any, rep: any) {
      if (search instanceof RegExp) return this.replace(search.global ? search : new RegExp(search.source, search.flags + 'g'), rep);
      return this.split(String(search)).join(typeof rep === 'function' ? rep(search) : String(rep));
    },
    configurable: true, writable: true,
  });
}
if (!(Array.prototype as any).flat) {
  Object.defineProperty(Array.prototype, 'flat', {
    value: function (this: any[], depth = 1): any[] {
      const walk = (a: any[], d: number): any[] => a.reduce((acc: any[], v: any) => (Array.isArray(v) && d > 0 ? acc.concat(walk(v, d - 1)) : acc.concat(v)), []);
      return walk(this, depth);
    }, configurable: true, writable: true,
  });
}
if (!(Array.prototype as any).flatMap) {
  Object.defineProperty(Array.prototype, 'flatMap', {
    value: function (this: any[], fn: any, thisArg?: any) { return this.map(fn, thisArg).flat(1); },
    configurable: true, writable: true,
  });
}
if (typeof g.structuredClone !== 'function') {
  g.structuredClone = (v: any) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
}
if (typeof (Promise as any).allSettled !== 'function') {
  (Promise as any).allSettled = (ps: Promise<any>[]) => Promise.all(Array.from(ps).map((p) => Promise.resolve(p).then(
    (value) => ({ status: 'fulfilled', value }), (reason) => ({ status: 'rejected', reason }))));
}
export {};

// Remove the browser's default focus ring (the gold/yellow outline) from every text box on the
// web build, in all registration steps. The app's own borders are unchanged.
if (typeof document !== 'undefined' && !document.getElementById('no-focus-ring')) {
  const style = document.createElement('style');
  style.id = 'no-focus-ring';
  style.textContent =
    'input, textarea, select, [contenteditable], input:focus, textarea:focus, select:focus, input:focus-visible, textarea:focus-visible ' +
    '{ outline: none !important; outline-color: transparent !important; box-shadow: none !important; -webkit-tap-highlight-color: transparent; }';
  document.head.appendChild(style);
}
