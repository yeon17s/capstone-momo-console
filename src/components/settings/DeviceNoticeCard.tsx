import { Badge, Card } from '../common'

export function DeviceNoticeCard() {
  return (
    <Card>
      <h2>장비 연동</h2>
      <Badge tone="warn">실측 검증 전</Badge>
      <ul>
        <li>읽기 전용 API는 아직 연결되지 않았습니다.</li>
        <li>웹에서 센서 조회, 로봇 명령, threshold·라벨 변경은 하지 않습니다.</li>
        <li>공개 threshold를 실장비에 적용하지 않습니다.</li>
      </ul>
    </Card>
  )
}
