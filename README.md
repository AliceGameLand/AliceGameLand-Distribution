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

배포 설정 1.0.5: 최초 설치 기본 셰이더는 `ComplementaryReimagined_r5.9.1.zip`이며 활성화 상태입니다.
`config/iris.properties`는 `options.txt`와 같이 MD5 검사를 생략해 파일이 없을 때만 내려받습니다. 기존 사용자의 셰이더 선택·활성화 설정을 강제로 덮어쓰지 않습니다.
기본 원본은 `client-defaults/config/iris.properties`이며 이번 작업에서 기존 클라이언트 설정 파일을 수정하지 않았습니다.

다이아몬드 대결 인스턴스 `AliceDiamond-26.2`는 `diamond-v1.0.0` 릴리스에 게시했습니다. 런처는 최신 릴리스의 `distribution.json`을 읽으며 기존 미니게임 인스턴스는 유지됩니다. 다이아 인스턴스는 현재 `218.158.75.168:12345`로 연결됩니다. 기존 `alicehiyam.dreamcraft.kr` SRV가 접속 불가한 이전 서버를 가리키므로 공인 IP가 바뀌면 `scripts/add-diamond.mjs`의 주소와 릴리스 배포 목록을 함께 갱신해야 합니다.
