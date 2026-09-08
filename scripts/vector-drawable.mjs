/** 转换 App 已有的 path / 平移 group，保留 Material Symbols 的负坐标视口映射。 */
export function vectorDrawableToSymbol(name, xml) {
  const attribute = (element, key) => element.match(new RegExp(`android:${key}="([^"]+)"`))?.[1];
  const width = attribute(xml, 'viewportWidth');
  const height = attribute(xml, 'viewportHeight');
  const content = [...xml.matchAll(/<group\b[^>]*>|<\/group>|<path\b[\s\S]*?\/>/g)]
    .map(([element]) => {
      if (element === '</group>') return '</g>';
      if (element.startsWith('<group')) {
        return `<g transform="translate(${attribute(element, 'translateX') ?? 0} ${attribute(element, 'translateY') ?? 0})">`;
      }
      if (attribute(element, 'fillColor') === '#00000000') return '';
      const rule = attribute(element, 'fillType') === 'evenOdd' ? ' fill-rule="evenodd"' : '';
      return `<path d="${attribute(element, 'pathData')}"${rule}/>`;
    })
    .join('');
  return {
    width,
    height,
    content,
    symbol: `<symbol id="${name}" viewBox="0 0 ${width} ${height}">${content}</symbol>`,
  };
}
