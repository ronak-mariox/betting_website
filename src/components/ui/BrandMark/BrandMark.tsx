import { useBranding } from '../../../lib/brandingContext';
import styles from './BrandMark.module.css';

export type BrandMarkProps = {
  /** Edge length in px — 55.992 on the login screen, smaller in the panel shell. */
  size?: number;
};

export function BrandMark({ size = 55.992 }: BrandMarkProps) {
  const { brand, initial } = useBranding();
  if (brand.logoUrl) {
    return (
      <img
        src={brand.logoUrl}
        alt=""
        aria-hidden="true"
        style={{ width: size, height: size, borderRadius: size * 0.2857, objectFit: 'cover' }}
      />
    );
  }
  return (
    <span
      className={styles.mark}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2857,
        fontSize: size * 0.393,
      }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
