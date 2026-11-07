// Each level uses the computer shop. Times are in seconds and targets in MB.
// guardCount is 0–4; guardBehaviour is "route", "observant", or "fullforce".
// guardArrival specifies initialDelay and interval in seconds.
// guardSpeed uses fractions of player speed; burstSeconds is a one-time boost.
// memoryRange contains the minimum and maximum non-zero memory amounts in MB.
const LEVEL_DATA = [
  { seconds: 120, targetMB: 64, memoryRange: { minMB: 2, maxMB: 32 }, guardCount: 0, guardBehaviour: "route", guardSpeed: { normal: 0.59, burstSeconds: 5, burst: 0.74 }, guardArrival: { initialDelay: 0, interval: 5 } },
  { seconds: 110, targetMB: 128, memoryRange: { minMB: 4, maxMB: 32 }, guardCount: 1, guardBehaviour: "route", guardSpeed: { normal: 0.59, burstSeconds: 5, burst: 0.74 }, guardArrival: { initialDelay: 10, interval: 5 } },
  { seconds: 100, targetMB: 256, memoryRange: { minMB: 8, maxMB: 64 }, guardCount: 2, guardBehaviour: "observant", guardSpeed: { normal: 0.59, burstSeconds: 5, burst: 0.74 }, guardArrival: { initialDelay: 5, interval: 5 } },
  { seconds: 90, targetMB: 512, memoryRange: { minMB: 16, maxMB: 128 }, guardCount: 3, guardBehaviour: "observant", guardSpeed: { normal: 0.65, burstSeconds: 5, burst: 0.79 }, guardArrival: { initialDelay: 5, interval: 10 } },
  { seconds: 80, targetMB: 1024, memoryRange: { minMB: 32, maxMB: 256 }, guardCount: 4, guardBehaviour: "fullforce", guardSpeed: { normal: 0.7, burstSeconds: 5, burst: 0.84 }, guardArrival: { initialDelay: 0, interval: 5 } }
];
