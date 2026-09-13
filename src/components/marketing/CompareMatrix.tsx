import Link from 'next/link';

import { Cross, Tick } from './Tick';

export type Cell = boolean | string | null | { soon: string };

export type CompareRow = { label: string; cells: Cell[] };

export type CompareGroup = { title: string; rows: CompareRow[] };

export type CompareColumn = {
  name: string;
  ours?: boolean;
  href?: string;
};

export const CompareMatrix = ({ columns, groups }: { columns: CompareColumn[]; groups: CompareGroup[] }) => (
  <div className="overflow-x-auto rounded-studio-lg border border-site-rule bg-site-bg lg:overflow-visible">
    <table className="w-full min-w-4xl border-separate border-spacing-0 text-left align-middle">
      <caption className="sr-only">
        Church presentation software compared, feature by feature, across {columns.length} products
      </caption>

      <thead>
        <tr>
          <th
            scope="col"
            className="site-pinhead site-pinhead-corner w-[26%] bg-site-bg px-5 py-4 text-left text-[15px]
              font-semibold text-site-muted sm:px-6"
          >
            Feature
          </th>

          {columns.map(column => (
            <th
              key={column.name}
              scope="col"
              className={`site-pinhead px-4 py-4 text-center text-[15px] font-semibold ${
                column.ours
                  ? 'bg-[color-mix(in_oklab,var(--color-site-accent)_25%,var(--color-site-bg))] text-site-ink'
                  : 'bg-site-bg text-site-muted'
              }`}
            >
              {column.href
                ? (
                    <Link href={column.href} className="underline decoration-transparent hover:decoration-inherit">
                      {column.name}
                    </Link>
                  )
                : column.name}
            </th>
          ))}
        </tr>
      </thead>

      {groups.map(group => (
        <tbody key={group.title}>
          <tr>
            <th
              scope="colgroup"
              colSpan={columns.length + 1}
              className="border-t border-site-rule bg-site-band px-5 py-2.5 text-left text-[13px] font-semibold
                tracking-wide text-site-faint uppercase sm:px-6"
            >
              {group.title}
            </th>
          </tr>

          {group.rows.map(row => (
            <tr key={row.label}>
              <th
                scope="row"
                className="sticky left-0 z-10 border-t border-site-rule bg-site-bg px-5 py-4 text-left text-[15px]
                  leading-snug font-medium text-site-ink sm:px-6"
              >
                {row.label}
              </th>

              {row.cells.map((cell, index) => (
                <td
                  key={columns[index]?.name ?? index}
                  className={`border-t border-site-rule px-4 py-4 text-center text-[14px] leading-snug ${
                    columns[index]?.ours
                      ? 'bg-site-accent/18 font-semibold text-site-ink'
                      : 'text-site-muted'
                  }`}
                >
                  <Answer cell={cell} product={columns[index]?.name ?? ''} feature={row.label} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  </div>
);

const Answer = ({ cell, product, feature }: { cell: Cell; product: string; feature: string }) => {
  if (cell === true) {
    return (
      <>
        <Tick className="mx-auto size-4 text-current" />
        <span className="sr-only">{`${product}: yes, ${feature}`}</span>
      </>
    );
  }

  if (cell === false) {
    return (
      <>
        <Cross className="mx-auto size-4 text-site-faint/70" />
        <span className="sr-only">{`${product}: no`}</span>
      </>
    );
  }

  if (typeof cell === 'object' && cell !== null) {
    return (
      <span
        className="inline-block rounded-full bg-site-accent/35 px-2 py-0.5 text-[12px] font-medium text-site-ink"
      >
        {cell.soon}
      </span>
    );
  }

  if (cell === null) {
    return (
      <>
        <span aria-hidden className="text-site-faint">—</span>
        <span className="sr-only">{`${product}: we could not confirm this`}</span>
      </>
    );
  }

  return <span>{cell}</span>;
};
