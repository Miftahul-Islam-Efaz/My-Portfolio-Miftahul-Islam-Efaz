// Upstream this file builds a lil-gui tuning panel bound to every value in
// config.js. Two reasons it is a stub here:
//
//   1. lil-gui is not a dependency of this site. The import alone would fail
//      the Vite build.
//   2. A live tuning panel is a development affordance, not something to ship.
//
// The surface below is exactly what scene.js calls into, so scene.js is left
// untouched on this front and the upstream file can be dropped back in later
// if the effect ever needs re-dialling.
//
// To tune the look: run the original demo in Scroll-effect-new/, press `g`,
// dial it in, then copy the numbers across to config.js here.
export function createGui() {
  return {
    // scene.js reads this to decide which way `g` should toggle.
    _hidden: true,
    show() {},
    hide() {},
    destroy() {},
  };
}
