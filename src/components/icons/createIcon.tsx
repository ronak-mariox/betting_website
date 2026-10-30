import type { SVGProps } from 'react';

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'children'> & {
  /** Rendered edge length in px. Defaults to the icon's natural Figma size. */
  size?: number;
};

type IconSpec = {
  /** Natural artboard size exported from Figma. */
  size: number;
  /** Stroke width as exported, expressed in the icon's own viewBox units. */
  strokeWidth: number;
  paths: string[];
};

/**
 * Single factory behind every icon: the path data and geometry come straight
 * from the Figma SVG exports, only the stroke colour is swapped to
 * `currentColor` so one component can serve every state (idle / active /
 * on-gradient) without duplicating the glyph.
 */
export function createIcon(displayName: string, spec: IconSpec) {
  const Icon = ({ size = spec.size, ...rest }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${spec.size} ${spec.size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {spec.paths.map((d) => (
        <path
          key={d}
          d={d}
          stroke="currentColor"
          strokeWidth={spec.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );

  Icon.displayName = displayName;
  return Icon;
}
