import { DB } from '../../data/db'
import { useModel } from '../../context/ModelContext'
import { uniq } from '../../lib/format'
import { SelectField } from '../common'

export function ModelToolbar() {
  const { model, setModelField } = useModel()
  return (
    <div className="toolbar" aria-label="공통 Baseline 모델 필터">
      <SelectField
        label="평가 단위"
        value={model.representation}
        options={uniq(DB.models, 'representation')}
        onChange={(v) => setModelField('representation', v)}
      />
      <SelectField
        label="입력 구성"
        value={model.input_set}
        options={uniq(DB.models, 'input_set')}
        onChange={(v) => setModelField('input_set', v)}
      />
      <SelectField
        label="알고리즘"
        value={model.algorithm}
        options={uniq(DB.models, 'algorithm')}
        onChange={(v) => setModelField('algorithm', v)}
      />
      <div className="muted">
        <small>A: 전류·전압 / B: A + 위치·속도·오차 / C: B + 관절 iq</small>
      </div>
    </div>
  )
}
