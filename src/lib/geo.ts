import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { feature } from 'topojson-client';
import mapData from '../data/worldAtlasMap.json';
import { COUNTRY_BY_ISO3, COUNTRIES } from '../data/countries';

/**
 * Map data pipeline: Natural Earth 1:50m TopoJSON (world-atlas npm package)
 * -> projected paths + hit geometry per country.
 *
 * Everything heavy happens once; React only renders precomputed path strings.
 */

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 500;

/** Countries with less projected area than this get a clickable marker too. */
const MARKER_AREA_THRESHOLD = 4;

const NAME_TO_ISO3 = mapData.countries as Record<string, string>;

export type Bounds = [[number, number], [number, number]];

export interface CountryShape {
  iso3: string;
  name: string;
  /** SVG path in map coordinates, or null when the country has no polygon. */
  path: string | null;
  /** Projected area in square map units. */
  area: number;
  bounds: Bounds | null;
  /** Projected point used for labels and markers. */
  anchor: [number, number];
  /** True when the country should also be selectable through a marker. */
  isMarker: boolean;
}

export interface WorldGeoData {
  shapes: CountryShape[];
  shapeByIso3: Map<string, CountryShape>;
  spherePath: string;
  graticulePath: string;
  markerCount: number;
}

interface TopologyLike {
  objects: { countries: unknown };
}

function safeBounds(bounds: Bounds | null | undefined): Bounds | null {
  if (!bounds) return null;
  const [[x0, y0], [x1, y1]] = bounds;
  if (![x0, y0, x1, y1].every((value) => Number.isFinite(value))) return null;
  return [
    [x0, y0],
    [x1, y1],
  ];
}

export async function loadWorldGeo(signal?: AbortSignal): Promise<WorldGeoData> {
  const response = await fetch(`${import.meta.env.BASE_URL}geo/countries-50m.json`, { signal });
  if (!response.ok) {
    throw new Error(`The world map data could not be loaded (HTTP ${response.status}).`);
  }
  const topology = (await response.json()) as TopologyLike;

  const projection = geoNaturalEarth1().fitExtent(
    [
      [8, 8],
      [MAP_WIDTH - 8, MAP_HEIGHT - 8],
    ],
    { type: 'Sphere' } as unknown as FeatureCollection,
  );
  const pathGenerator = geoPath(projection);

  const collection = feature(
    topology as never,
    topology.objects.countries as never,
  ) as unknown as FeatureCollection<Geometry, { name?: string }>;

  const shapes: CountryShape[] = [];
  const shapeByIso3 = new Map<string, CountryShape>();

  for (const item of collection.features as Feature<Geometry, { name?: string }>[]) {
    const naturalEarthName = item.properties?.name;
    if (!naturalEarthName) continue;
    const iso3 = NAME_TO_ISO3[naturalEarthName];
    const country = iso3 ? COUNTRY_BY_ISO3.get(iso3) : undefined;
    if (!iso3 || !country) continue;

    const path = pathGenerator(item);
    if (!path) continue;

    const area = Math.abs(pathGenerator.area(item));
    const bounds = safeBounds(pathGenerator.bounds(item) as unknown as Bounds);
    const projectedCentroid = pathGenerator.centroid(item);
    const centroid: [number, number] = [
      Number.isFinite(projectedCentroid[0]) ? projectedCentroid[0] : MAP_WIDTH / 2,
      Number.isFinite(projectedCentroid[1]) ? projectedCentroid[1] : MAP_HEIGHT / 2,
    ];
    const projectedAnchor = country.anchor
      ? projection([country.anchor[1], country.anchor[0]])
      : null;
    const anchor: [number, number] = projectedAnchor
      ? [projectedAnchor[0], projectedAnchor[1]]
      : centroid;

    const shape: CountryShape = {
      iso3,
      name: country.name,
      path,
      area,
      bounds,
      anchor,
      isMarker: area < MARKER_AREA_THRESHOLD || Boolean(country.anchor),
    };
    shapes.push(shape);
    shapeByIso3.set(iso3, shape);
  }

  // Countries with no polygon at this resolution (Tuvalu at 1:50m) still need
  // to be selectable, so they become marker-only shapes at their anchor.
  for (const country of COUNTRIES) {
    if (shapeByIso3.has(country.iso3)) continue;
    if (!country.anchor) continue;
    const projected = projection([country.anchor[1], country.anchor[0]]);
    if (!projected) continue;
    const shape: CountryShape = {
      iso3: country.iso3,
      name: country.name,
      path: null,
      area: 0,
      bounds: [
        [projected[0] - 5, projected[1] - 5],
        [projected[0] + 5, projected[1] + 5],
      ],
      anchor: [projected[0], projected[1]],
      isMarker: true,
    };
    shapes.push(shape);
    shapeByIso3.set(country.iso3, shape);
  }

  shapes.sort((a, b) => a.name.localeCompare(b.name, 'en'));

  return {
    shapes,
    shapeByIso3,
    spherePath: pathGenerator({ type: 'Sphere' } as never) ?? '',
    graticulePath: pathGenerator(geoGraticule10()) ?? '',
    markerCount: shapes.filter((shape) => shape.isMarker).length,
  };
}

/** Shared promise so route changes never refetch the map. */
let cached: Promise<WorldGeoData> | null = null;

export function getWorldGeo(): Promise<WorldGeoData> {
  if (!cached) {
    cached = loadWorldGeo().catch((error: unknown) => {
      cached = null;
      throw error;
    });
  }
  return cached;
}

export function unionBounds(shapes: readonly CountryShape[]): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;
  for (const shape of shapes) {
    if (!shape.bounds) continue;
    found = true;
    minX = Math.min(minX, shape.bounds[0][0]);
    minY = Math.min(minY, shape.bounds[0][1]);
    maxX = Math.max(maxX, shape.bounds[1][0]);
    maxY = Math.max(maxY, shape.bounds[1][1]);
  }
  if (!found) return null;
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

/** How much to zoom and pan to frame a region of the map. */
export interface FitTransform {
  k: number;
  x: number;
  y: number;
}

export function transformForBounds(bounds: Bounds, padding = 34): FitTransform {
  const [[x0, y0], [x1, y1]] = bounds;
  const width = Math.max(1, x1 - x0);
  const height = Math.max(1, y1 - y0);
  const k = Math.min(
    16,
    Math.max(1, Math.min((MAP_WIDTH - padding * 2) / width, (MAP_HEIGHT - padding * 2) / height)),
  );
  const centerX = (x0 + x1) / 2;
  const centerY = (y0 + y1) / 2;
  return {
    k,
    x: MAP_WIDTH / 2 - centerX * k,
    y: MAP_HEIGHT / 2 - centerY * k,
  };
}

/** Projected bounds for a set of ISO3 codes, used to frame a region. */
export function boundsForCountries(
  shapes: readonly CountryShape[],
  iso3Codes: readonly string[],
): Bounds | null {
  const wanted = new Set(iso3Codes);
  return unionBounds(shapes.filter((shape) => wanted.has(shape.iso3)));
}
