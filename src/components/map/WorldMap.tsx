import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { select } from 'd3-selection';
import {
  zoom as createZoom,
  zoomIdentity,
  zoomTransform,
  type D3ZoomEvent,
  type ZoomBehavior,
  type ZoomTransform,
} from 'd3-zoom';
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  transformForBounds,
  type Bounds,
  type CountryShape,
} from '../../lib/geo';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';

const MIN_ZOOM = 1;
const MAX_ZOOM = 16;

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

interface CountriesLayerProps {
  shapes: CountryShape[];
  solvedIso3: ReadonlySet<string>;
  missedIso3: ReadonlySet<string>;
  wrongIso3: string | null;
  targetIso3: string | null;
  selectable: boolean;
}

/**
 * The 195 country paths are memoised: hover and tooltip state live in the
 * parent, so moving the pointer never re-renders the geometry.
 */
const CountriesLayer = memo(function CountriesLayer({
  shapes,
  solvedIso3,
  missedIso3,
  wrongIso3,
  targetIso3,
  selectable,
}: CountriesLayerProps) {
  return (
    <g>
      {shapes.map((shape) => {
        if (!shape.path) return null;
        const classes = ['map-path'];
        if (missedIso3.has(shape.iso3)) classes.push('is-missed');
        if (solvedIso3.has(shape.iso3)) classes.push('is-solved');
        if (wrongIso3 === shape.iso3) classes.push('is-wrong');
        if (targetIso3 === shape.iso3) classes.push('is-target');
        return (
          <path
            key={shape.iso3}
            d={shape.path}
            className={classes.join(' ')}
            data-iso3={shape.iso3}
            data-interactive={selectable}
          />
        );
      })}
    </g>
  );
});

export interface WorldMapProps {
  shapes: CountryShape[];
  spherePath: string;
  graticulePath: string;
  solved?: readonly string[];
  missed?: readonly string[];
  wrongIso3?: string | null;
  targetIso3?: string | null;
  labels?: 'hover' | 'always' | 'never';
  showAllNames?: boolean;
  markers?: boolean;
  /** Enables zoom, pan and map controls. */
  interactive?: boolean;
  /** Whether clicks are accepted right now (cursor + hover states follow this). */
  selectable?: boolean;
  fitBounds?: Bounds | null;
  fitKey?: string | number;
  onSelect?: (iso3: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function WorldMap({
  shapes,
  spherePath,
  graticulePath,
  solved,
  missed,
  wrongIso3 = null,
  targetIso3 = null,
  labels = 'hover',
  showAllNames = false,
  markers = true,
  interactive = false,
  selectable = false,
  fitBounds = null,
  fitKey = 0,
  onSelect,
  className,
  ariaLabel = 'World map',
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewportRef = useRef<SVGGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const animRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<ZoomTransform | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const fitBoundsRef = useRef<Bounds | null>(fitBounds);

  const [view, setView] = useState<ZoomTransform>(zoomIdentity);
  const [hovered, setHovered] = useState<string | null>(null);

  fitBoundsRef.current = fitBounds;

  const shapeByIso3 = useMemo(() => new Map(shapes.map((shape) => [shape.iso3, shape])), [shapes]);
  const solvedIso3 = useMemo(() => new Set(solved ?? []), [solved]);
  const missedIso3 = useMemo(() => new Set(missed ?? []), [missed]);

  const animateTo = useCallback((target: { k: number; x: number; y: number }, duration = 520) => {
    const svg = svgRef.current;
    const behavior = zoomRef.current;
    if (!svg || !behavior) return;
    const selection = select(svg);
    const start = zoomTransform(svg);
    if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    const startedAt = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = easeInOut(progress);
      const next = zoomIdentity
        .translate(
          start.x + (target.x - start.x) * eased,
          start.y + (target.y - start.y) * eased,
        )
        .scale(start.k + (target.k - start.k) * eased);
      behavior.transform(selection, next);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        animRef.current = null;
      }
    };
    animRef.current = requestAnimationFrame(step);
  }, []);

  /* Zoom + pan setup. Only re-runs if interactivity itself changes. */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !interactive) return;

    const selection = select(svg);
    const behavior = createZoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        const transform = event.transform;
        viewportRef.current?.setAttribute('transform', transform.toString());
        pendingRef.current = transform;
        if (frameRef.current === null) {
          frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            const pending = pendingRef.current;
            if (pending) setView(zoomIdentity.translate(pending.x, pending.y).scale(pending.k));
          });
        }
      });

    selection.call(behavior);
    selection.on('dblclick.zoom', null);
    zoomRef.current = behavior;
    behavior.transform(selection, zoomIdentity);
    setView(zoomIdentity);

    return () => {
      selection.on('.zoom', null);
      zoomRef.current = null;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [interactive]);

  /* Frame a region whenever the caller asks for it. */
  useEffect(() => {
    if (!interactive) return;
    const bounds = fitBoundsRef.current;
    animateTo(bounds ? transformForBounds(bounds) : { k: MIN_ZOOM, x: 0, y: 0 });
    // fitKey is the intentional trigger; fitBounds is read through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, interactive, animateTo]);

  const positionTooltip = useCallback(() => {
    const element = tooltipRef.current;
    if (!element) return;
    element.style.transform = `translate3d(${pointerRef.current.x + 14}px, ${
      pointerRef.current.y + 14
    }px, 0)`;
  }, []);

  const hoveredShape = hovered ? shapeByIso3.get(hovered) : null;
  const canShowHoverName = Boolean(hoveredShape && (showAllNames || solvedIso3.has(hoveredShape.iso3)));

  useEffect(() => {
    if (canShowHoverName) positionTooltip();
  }, [canShowHoverName, hovered, positionTooltip]);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    positionTooltip();
    const target = event.target as Element | null;
    const iso3 = target?.closest?.('[data-iso3]')?.getAttribute('data-iso3') ?? null;
    if (iso3 !== hoveredRef.current) {
      hoveredRef.current = iso3;
      setHovered(iso3);
    }
  };

  const handlePointerLeave = () => {
    hoveredRef.current = null;
    setHovered(null);
  };

  const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!onSelect || !selectable) return;
    const down = downRef.current;
    if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 8) return;
    const target = event.target as Element | null;
    const iso3 = target?.closest?.('[data-iso3]')?.getAttribute('data-iso3');
    if (iso3) onSelect(iso3);
  };

  const zoomBy = (factor: number) => {
    const nextK = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.k * factor));
    const ratio = nextK / view.k;
    animateTo(
      {
        k: nextK,
        x: MAP_WIDTH / 2 - ratio * (MAP_WIDTH / 2 - view.x),
        y: MAP_HEIGHT / 2 - ratio * (MAP_HEIGHT / 2 - view.y),
      },
      220,
    );
  };

  const resetView = () => {
    const bounds = fitBoundsRef.current;
    animateTo(bounds ? transformForBounds(bounds) : { k: MIN_ZOOM, x: 0, y: 0 }, 320);
  };

  const project = (point: [number, number]): [number, number] => [
    point[0] * view.k + view.x,
    point[1] * view.k + view.y,
  ];

  const visibleLabels = useMemo(() => {
    const items: { iso3: string; name: string; x: number; y: number }[] = [];
    for (const shape of shapes) {
      const isSolved = solvedIso3.has(shape.iso3);
      const isTarget = shape.iso3 === targetIso3;
      let visible = false;
      if (showAllNames) {
        visible = isTarget || (isSolved ? true : shape.area * view.k * view.k > 700);
      } else if (labels === 'always') {
        visible = isSolved || isTarget;
      } else if (labels === 'hover') {
        visible = isTarget || (isSolved && view.k > 1.55);
      }
      if (!visible) continue;
      if (shape.isMarker && view.k < 2.1 && !isTarget) continue;
      const [x, y] = project(shape.anchor);
      if (x < -40 || y < -40 || x > MAP_WIDTH + 40 || y > MAP_HEIGHT + 40) continue;
      items.push({ iso3: shape.iso3, name: shape.name, x, y });
    }
    return items.slice(0, 140);
  }, [shapes, solvedIso3, showAllNames, labels, view, targetIso3]);

  const markerShapes = useMemo(() => (markers ? shapes.filter((shape) => shape.isMarker) : []), [
    markers,
    shapes,
  ]);

  return (
    <div
      ref={containerRef}
      className={cx('map-shell relative h-full w-full overflow-hidden', className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={(event) => {
        downRef.current = { x: event.clientX, y: event.clientY };
      }}
      onClick={handleClick}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="map-svg"
        role="img"
        aria-label={ariaLabel}
      >
        <path d={spherePath} fill="var(--ocean)" />
        <g ref={viewportRef}>
          <path
            d={spherePath}
            fill="var(--ocean)"
            stroke="var(--border-strong)"
            strokeWidth="0.7"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={graticulePath}
            fill="none"
            stroke="var(--graticule)"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
          />
          <CountriesLayer
            shapes={shapes}
            solvedIso3={solvedIso3}
            missedIso3={missedIso3}
            wrongIso3={wrongIso3}
            targetIso3={targetIso3}
            selectable={selectable}
          />
        </g>

        {/* Overlay layer: constant-size markers and labels above the zoomed geometry */}
        <g>
          {markerShapes.map((shape) => {
            const [x, y] = project(shape.anchor);
            const isTarget = shape.iso3 === targetIso3;
            const isWrong = shape.iso3 === wrongIso3;
            return (
              <g
                key={shape.iso3}
                data-iso3={shape.iso3}
                className="map-marker"
                transform={`translate(${x} ${y})`}
              >
                {isTarget ? (
                  <circle
                    r={8}
                    fill="none"
                    stroke="var(--warning)"
                    strokeWidth={1.4}
                    className="animate-ping-soft"
                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                  />
                ) : null}
                <circle r={9} fill="transparent" pointerEvents="all" />
                <circle
                  r={2.7}
                  className={cx(
                    'map-marker-dot',
                    solvedIso3.has(shape.iso3) && 'is-solved',
                    isWrong && 'is-wrong',
                    isTarget && 'is-target',
                  )}
                />
              </g>
            );
          })}

          {visibleLabels.map((label) => (
            <text
              key={label.iso3}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="map-label"
              fontSize={10.5}
            >
              {label.name}
            </text>
          ))}
        </g>
      </svg>

      {canShowHoverName && hoveredShape ? (
        <div
          ref={tooltipRef}
          className="map-tooltip absolute left-0 top-0 z-10 rounded-lg px-2 py-1 text-[11px] font-semibold shadow-lg"
        >
          {hoveredShape.name}
        </div>
      ) : null}

      {interactive ? (
        <>
          <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
            <button
              type="button"
              aria-label="Zoom in"
              title="Zoom in"
              onClick={() => zoomBy(1.6)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface/90 text-muted shadow transition-colors hover:text-ink"
            >
              <Icon name="plus" size={15} />
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              title="Zoom out"
              onClick={() => zoomBy(1 / 1.6)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface/90 text-muted shadow transition-colors hover:text-ink"
            >
              <Icon name="minus" size={15} />
            </button>
            <button
              type="button"
              aria-label="Reset view"
              title="Reset view"
              onClick={resetView}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface/90 text-muted shadow transition-colors hover:text-ink"
            >
              <Icon name="expand" size={15} />
            </button>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 hidden text-[10px] font-medium text-muted sm:block">
            Drag to pan · Scroll to zoom
          </div>
        </>
      ) : null}
    </div>
  );
}
