interface Props {
  page: number
  pageCount: number
  onChange: (page: number) => void
}

export function Pager({ page, pageCount, onChange }: Props) {
  return (
    <div className="pager">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}>
        이전
      </button>
      <span aria-live="polite">
        {page} / {pageCount}
      </span>
      <button disabled={page === pageCount} onClick={() => onChange(page + 1)}>
        다음
      </button>
    </div>
  )
}
