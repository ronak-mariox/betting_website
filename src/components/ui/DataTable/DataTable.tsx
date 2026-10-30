import type { ReactNode } from 'react';
import { cx } from '../../../lib/cx';
import styles from './DataTable.module.css';

export type Column<Row> = {
  key: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  align?: 'left' | 'right';
  width?: number | string;
};

export type DataTableProps<Row> = {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** 'lg' = 46px rows, 'md' = 43px, 'sm' = 41px compact rows. */
  size?: 'lg' | 'md' | 'sm';
  /** Shown instead of rows: a message, or a <Loader block /> while the rows load. */
  emptyMessage?: ReactNode;
  /** Extra class per row — used to tint rows that need attention. */
  rowClassName?: (row: Row) => string | undefined;
  onRowClick?: (row: Row) => void;
};

/** One table implementation for every list screen across the four panels. */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  size = 'md',
  emptyMessage = 'Nothing to show yet.',
  rowClassName,
  onRowClick,
}: DataTableProps<Row>) {
  if (rows.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <div className={styles.wrapper}>
      <table className={cx(styles.table, styles[size])}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cx(styles.th, column.align === 'right' && styles.right)}
                style={column.width ? { width: column.width } : undefined}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={cx(styles.row, onRowClick && styles.clickable, rowClassName?.(row))}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cx(styles.td, column.align === 'right' && styles.right)}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
