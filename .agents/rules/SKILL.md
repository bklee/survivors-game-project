---
trigger: always_on
description: Activates when the user wants to build "Zen-Pop," a global ASMR/Healing web service. It specializes in MediaPipe Hand Tracking, Canvas Physics, Web Audio API, and Gemini AI integration for subconscious learning.
---

## Workflow Rules

- **Git Commit**: 작업이 완료되면 항상 `git add` & `git commit`을 수행한다. 커밋 메시지는 변경 내용을 명확하게 기술한다.
- **No Auto-Deploy**: 배포(deploy)는 절대 사용자의 명시적 허락 없이 실행하지 않는다. 반드시 사용자에게 먼저 확인 후 진행한다.
- **Build vs Deploy**: 빌드(Build, 예: `npm run build` 등)와 배포(Deploy, 예: `deploy.exp` 등)는 명확히 구분되는 별개의 작업이다. 사용자가 "빌드해"라고 요청했을 때는 로컬 빌드만 수행해야 하며, 절대 배포 과정까지 임의로 이어서 진행하지 않는다.
- **Single Deployment**: "운영에 배포해"와 같은 배포 요청이 있을 경우, 해당 요청 시점에 딱 한 번만 배포를 수행한다. 이후의 작업들에서 사용자의 명시적 요청 없이 중복으로 배포를 진행하지 않는다.
