/**
 * Material 3 Expressive 形状库（androidx.graphics.shapes.MaterialShapes）中饼干类形状的极坐标近似。
 * 构建脚本用它生成 SVG 形状，页面脚本用它生成可以过渡的 clip-path。
 *
 * lobes：饱满的瓣、收紧的瓣间凹口；softness 越大，凹口圆角越大、整体越柔和；depth 为 0 时就是圆。
 * 返回值是「角度 → 相对半径」的函数，角度从顶点（正上方）起算。
 */
export const lobes = (count, depth, softness) => (angle) => {
  const wave = Math.sqrt(Math.cos((count * angle) / 2) ** 2 + softness) / Math.sqrt(1 + softness);
  return 1 - depth + depth * wave;
};

/**
 * 生成以元素中心为圆心、顶点朝上的 clip-path polygon()。
 * 点数相同的两个 polygon() 之间浏览器会逐点插值，因此形状变化用同一个 samples 生成。
 */
export function shapePolygon(radiusAt, samples = 144) {
  const points = [];
  for (let index = 0; index < samples; index++) {
    const angle = (index / samples) * Math.PI * 2;
    const radius = 50 * radiusAt(angle);
    const x = 50 + radius * Math.sin(angle);
    const y = 50 - radius * Math.cos(angle);
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }
  return `polygon(${points.join(', ')})`;
}
