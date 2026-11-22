const REVISION = '8633e31ad5652279a4daa25273d8cbfe82060e96'
const REPO = 'https://github.com/yeon17s/capstone-momo-console'

export function Footer() {
  return (
    <footer>
      MOmO · Revision 03
      <br />
      voraus-AD / Yu-Cobot · {REVISION.slice(0, 7)}
      <br />
      
      <a
        href={`${REPO}/blob/${REVISION}/docs/UI_REVISION_NOTES.md`}
        target="_blank"
        rel="noopener noreferrer"
      >
        UI_REVISION_NOTES.md
      </a>{' '}
      ·{' '}
      <a
        href={`${REPO}/tree/${REVISION}/docs/frontend-reference`}
        target="_blank"
        rel="noopener noreferrer"
      >
        원본 CSV·실험 설정
      </a>
    </footer>
  )
}
