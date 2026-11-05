/**
 * 构建期生成的 Material 3 Expressive 形状（公式见 src/material-shapes.js），
 * 与 Android 仓库 docs/横幅/banner.html 使用同一组参数，网站与 README 横幅的形状保持一致。
 * Cookie9 另有从 App 依赖直接导出的精确版本（public/assets/cookie-nine.svg），下载区小电视底座使用它。
 */
import { lobes } from '../src/material-shapes.js';

const SHAPES = {
  cookie12: lobes(12, 0.06, 0.2),
  cookie9: lobes(9, 0.12, 0.1),
  cookie6: lobes(6, 0.12, 0.15),
  cookie4: lobes(4, 0.2, 0.12),
  clover4: lobes(4, 0.3, 0.12),
  flower: lobes(8, 0.16, 0.1),
};

/** 生成 viewBox 0 0 100 100 内的 SVG symbol，形状顶点朝上、居中。 */
export function materialShapeSymbols() {
  const samples = 360;
  return Object.entries(SHAPES).map(([name, radiusAt]) => {
    let path = '';
    for (let index = 0; index < samples; index++) {
      const angle = (index / samples) * Math.PI * 2;
      const radius = 50 * radiusAt(angle);
      const x = 50 + radius * Math.cos(angle - Math.PI / 2);
      const y = 50 + radius * Math.sin(angle - Math.PI / 2);
      path += `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return `<symbol id="shape-${name}" viewBox="0 0 100 100"><path d="${path}Z"/></symbol>`;
  });
}
