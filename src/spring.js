/**
 * 把 Compose 的 spring(dampingRatio, stiffness) 转成 Web Animations 可用的 linear() 缓动与时长，
 * 让网页动效与 App 的 MotionScheme 一致。弹簧质量为 1，从 0 运动到 1。
 *
 * MotionScheme.expressive() 的取值（androidx.compose.material3）：
 * - defaultSpatial：阻尼 0.8、刚度 380   - fastSpatial：阻尼 0.6、刚度 800
 * - defaultEffects：阻尼 1、刚度 1600     - fastEffects：阻尼 1、刚度 3800
 */
export const MOTION = {
  defaultSpatial: { dampingRatio: 0.8, stiffness: 380 },
  fastSpatial: { dampingRatio: 0.6, stiffness: 800 },
  defaultEffects: { dampingRatio: 1, stiffness: 1600 },
};

const SAMPLE_MS = 10;
const SETTLE_THRESHOLD = 0.001;

function position(t, { dampingRatio, stiffness }) {
  const omega = Math.sqrt(stiffness);
  if (dampingRatio >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t);
  const dampedOmega = omega * Math.sqrt(1 - dampingRatio ** 2);
  const decay = Math.exp(-dampingRatio * omega * t);
  return (
    1 -
    decay *
      (Math.cos(dampedOmega * t) +
        ((dampingRatio * omega) / dampedOmega) * Math.sin(dampedOmega * t))
  );
}

const cache = new Map();

/** 返回 { easing, duration }：按 10ms 采样，直到位移稳定在终点附近。 */
export function springTiming(spring) {
  const key = `${spring.dampingRatio}/${spring.stiffness}`;
  if (cache.has(key)) return cache.get(key);
  const points = [0];
  let settledFor = 0;
  for (let time = SAMPLE_MS; settledFor < 5; time += SAMPLE_MS) {
    const value = position(time / 1000, spring);
    points.push(Number(value.toFixed(4)));
    settledFor = Math.abs(1 - value) < SETTLE_THRESHOLD ? settledFor + 1 : 0;
  }
  points[points.length - 1] = 1;
  const timing = {
    easing: `linear(${points.join(', ')})`,
    duration: (points.length - 1) * SAMPLE_MS,
  };
  cache.set(key, timing);
  return timing;
}
