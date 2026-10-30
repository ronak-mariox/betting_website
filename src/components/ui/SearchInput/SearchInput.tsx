import type { InputHTMLAttributes } from 'react';
import { SearchIcon } from '../../icons';
import { cx } from '../../../lib/cx';
import styles from './SearchInput.module.css';

export type SearchInputSize = 'sm' | 'md' | 'lg';

export type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  size?: SearchInputSize;
};

const ICON_SIZE: Record<SearchInputSize, number> = { sm: 12, md: 12.991, lg: 13.5 };

/** Single search field used by the sidebar, the topbar and page toolbars. */
export function SearchInput({ size = 'md', className, ...rest }: SearchInputProps) {
  return (
    <div className={cx(styles.wrapper, styles[size], className)}>
      <span className={styles.icon}>
        <SearchIcon size={ICON_SIZE[size]} />
      </span>
      <input className={styles.input} type="search" {...rest} />
    </div>
  );
}
