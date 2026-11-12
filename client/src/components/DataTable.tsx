import React from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#e8e1d6] text-[10.5px] font-semibold text-[#78736c]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-2.5 px-2 ${col.align === 'right' ? 'text-right' : ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#efe9de] text-[11.5px]">
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`${
                onRowClick ? 'hover:bg-[#f4eee3]/70 cursor-pointer transition-colors' : ''
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-2.5 px-2 ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
