#!/bin/zsh
# 로컬 대시보드 종료 (포트 3000)
# 사용법: ./stop-local.sh
PIDS=$(lsof -ti:3000 2>/dev/null)
if [ -z "$PIDS" ]; then
  echo "실행 중인 로컬 서버 없음 (:3000 비어있음)"
  exit 0
fi
echo "종료 중: $PIDS"
kill $PIDS 2>/dev/null
sleep 2
if lsof -ti:3000 >/dev/null 2>&1; then
  echo "일반 종료 실패 → 강제 종료"
  lsof -ti:3000 | xargs kill -9 2>/dev/null
  sleep 1
fi
lsof -ti:3000 >/dev/null 2>&1 && echo "종료 실패" || echo "로컬 서버 종료됨"
