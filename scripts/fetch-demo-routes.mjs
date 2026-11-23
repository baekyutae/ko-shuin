// 예시 하루의 인장 지점 사이 도보 경로를 한 번 받아 JSON으로 저장한다.
// 출처: routing.openstreetmap.de (OSRM foot, © OpenStreetMap contributors, ODbL)
import { writeFileSync } from 'node:fs';

const stops = [
  ['gyeongbokgung', 126.9770, 37.5796],
  ['bukchon', 126.9850, 37.5826],
  ['insadong', 126.9850, 37.5740],
  ['gwangjang', 126.9996, 37.5701],
  ['ddp', 127.0092, 37.5665],
  ['myeongdong', 126.9850, 37.5636],
  ['namsan', 126.9882, 37.5512],
];

const legs = [];
for (let i = 0; i < stops.length - 1; i++) {
  const [from, x1, y1] = stops[i];
  const [to, x2, y2] = stops[i + 1];
  const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${x1},${y1};${x2},${y2}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const json = await res.json();
  const r = json.routes[0];
  const coords = r.geometry.coordinates.map(([x, y]) => [+x.toFixed(6), +y.toFixed(6)]);
  legs.push({ from, to, distanceM: Math.round(r.distance), coords });
  console.log(from, '->', to, Math.round(r.distance), 'm', coords.length, 'pts');
  await new Promise((r) => setTimeout(r, 1200));
}
writeFileSync(new URL('../src/regions/seoul/demoRoutes.json', import.meta.url), JSON.stringify(legs));
