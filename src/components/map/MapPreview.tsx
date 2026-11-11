import { useMemo, type CSSProperties } from 'react';
import { cx } from '../../lib/cx';
import { MAP_HEIGHT, MAP_WIDTH, transformForBounds, type Bounds, type CountryShape } from '../../lib/geo';

/**
 * Static, non-interactive map used for previews and progress cards.
 * It shares projected paths with the interactive map, so it costs no extra data.
 */
export function MapPreview({
  shapes,
  spherePath,
  graticulePath,
  highlight,
  dim,
  focus,
  className,
  style,
}: {
  shapes: CountryShape[];
  spherePath: string;
  graticulePath: string;
  highlight?: ReadonlySet<string>;
  dim?: boolean;
  focus?: Bounds | null;
  className?: string;
  style?: CSSProperties;
}) {
  const transform = useMemo(() => (focus ? transformForBounds(focus, 4) : { k: 1, x: 0, y: 0 }), [focus]);

  return (
    <div className={cx('map-shell relative overflow-hidden', className)} style={style}>
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        aria-hidden="true"
      >
        <path d={spherePath} fill="var(--ocean)" />
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          <path
            d={graticulePath}
            fill="none"
            stroke="var(--graticule)"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
          />
          {shapes.map((shape) =>
            shape.path ? (
              <path
                key={shape.iso3}
                d={shape.path}
                className={cx('map-path', highlight?.has(shape.iso3) && 'is-solved')}
                style={dim && !highlight?.has(shape.iso3) ? { opacity: 0.55 } : undefined}
              />
            ) : null,
          )}
        </g>
      </svg>
    </div>
  );
}
