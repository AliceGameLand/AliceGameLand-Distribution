# 앨리스의 게임랜드 배포 저장소

Helios 기반 런처가 사용하는 Minecraft 26.2 / NeoForge 26.2.0.59 배포 매니페스트입니다.

```powershell
npm run generate
npm run verify
```

생성 시 기본적으로 다음 로컬 원본을 읽습니다.

- Prism 클라이언트: `C:\Users\gptnr\AppData\Roaming\PrismLauncher\instances\26.2(2)\minecraft`
- Prism 라이브러리: `C:\Users\gptnr\AppData\Roaming\PrismLauncher\libraries`
- 런처: `C:\Users\gptnr\Desktop\앨리스런쳐`

다른 환경에서는 `ALICE_PRISM_MINECRAFT`, `ALICE_PRISM_LIBRARIES`, `ALICE_LAUNCHER_ROOT` 환경 변수로 경로를 교체할 수 있습니다.

`release-assets`의 파일을 `client-v1.0.0` GitHub Release에 올리고 `distribution.json`을 포함해야 합니다. All Rights Reserved 모드는 저장소나 릴리스에 재배포하지 않고 공식 CurseForge CDN 주소를 사용합니다.

