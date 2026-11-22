import type { ReactNode } from 'react'
import { Empty } from './Empty'

interface TableProps {
  headers: string[]
  rows: ReactNode[][]
}

export function Table({ headers, rows }: TableProps) {
  if (!rows.length) return <Empty>해당 조건의 결과가 없습니다. 필터를 확인하세요.</Empty>
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
