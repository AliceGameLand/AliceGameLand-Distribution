# 앨리스의 게임랜드 배포 저장소

[앨리스의 게임랜드 런처](https://github.com/AliceGameLand/AliceGameLand-Launcher)가 사용하는 서버 목록과 게임 파일 배포 정보를 관리합니다. 런처 설치파일과 업데이트는 런처 저장소에서 별도로 제공합니다.

## 현재 배포 파일

루트의 `distribution.json`은 여러 서버를 포함한 운영 배포 목록입니다. 기존 `release-assets/`와 서버별 `*-release-assets/`, 게시된 GitHub Release는 유지합니다.

**`npm run generate`는 초기 Minecraft 26.2 / NeoForge 26.2.0.59 서버 구성을 생성하는 도구입니다. 현재 여러 서버의 배포 목록을 재생성하는 명령이 아닙니다.** 생성 결과를 운영 `distribution.json`이나 기존 릴리스에 그대로 덮어쓰지 마세요.

## 배포 전용 원본

생성기는 개인 Prism 인스턴스나 런처 프로젝트를 읽지 않습니다. 저장소 안의 `distribution-source/`를 기본 원본으로 사용합니다.

```text
distribution-source/
├─ minecraft/
│  ├─ mods/                  # 배포할 모드 JAR
│  ├─ config/                # 배포용 기본 설정
│  └─ resourcepacks/pack.zip  # 기본 리소스팩
├─ libraries/                # Maven 경로 구조의 NeoForge 설치기·런타임 라이브러리
└─ server-icon.png           # 서버 아이콘
```

현재 PC에는 기존 배포 원본을 복사하고, 필요한 공식 모드·라이브러리를 해시 검증하여 이 폴더를 준비했습니다. 개인 월드·계정·로그·스크린샷은 복사하지 않았습니다. 이후 모드와 설정 변경은 개인 Prism 폴더가 아닌 배포 원본에 반영하세요.

`client-defaults/`에는 의도적으로 관리하는 공통 기본값이 있습니다. 같은 이름의 설정과 `resourcepacks/pack.zip`은 이 폴더의 파일을 우선 사용하며, 이모트·셰이더 원본도 이곳에서 읽습니다.

원본 바이너리와 생성 결과는 Git에 포함하지 않습니다. 다른 PC에서 생성하려면 `distribution-source/`와 Git에서 제외된 `client-defaults/`의 바이너리를 별도로 복사·백업해야 합니다. All Rights Reserved 모드는 릴리스에 재배포하지 않고 공식 다운로드 URL을 사용합니다.

원본을 다른 위치에 보관할 경우 다음 환경 변수를 사용합니다.

```powershell
$env:ALICE_DISTRIBUTION_SOURCE = 'D:\AliceGameLand\distribution-source'
```

이전 `ALICE_PRISM_MINECRAFT`, `ALICE_PRISM_LIBRARIES`, `ALICE_LAUNCHER_ROOT` 변수는 사용하지 않습니다. 원본이 누락되면 오류로 중단하며 개인 폴더로 대체하지 않습니다.

## 생성 및 검증

Node.js 환경에서 실행합니다.

```powershell
npm run generate
npm run verify
```

결과는 운영 파일과 분리된 아래 폴더에 저장합니다.

```text
generated/client-v1.0.0/
├─ distribution.json
├─ mod-manifest.json
└─ release-assets/
```

`npm run verify` 역시 이 생성 결과만 검사합니다. 기존 루트의 배포 목록과 파일을 변경하거나 릴리스를 게시하지 않습니다. 생성 결과의 URL은 초기 `client-v1.0.0` 릴리스를 가리키므로, 실제 게시 전에는 대상 서버·버전·URL·파일 해시를 확인하고 운영 목록에 필요한 변경만 반영해야 합니다.

## 기본 설정 보존

- 새 인스턴스는 `tutorialStep:none`, `guiScale:4`를 기본으로 사용합니다.
- 기본 셰이더는 `ComplementaryReimagined_r5.9.1.zip`이며 활성화 상태입니다.
- `options.txt`, `config/iris.properties`, `servers.dat`는 MD5 검사 없이 파일이 없을 때만 내려받도록 생성합니다. 기존 사용자의 게임 옵션·셰이더 선택·서버 목록을 덮어쓰지 않습니다.

서버별 모드·주소 변경은 현재 `distribution.json`과 해당 서버의 생성 스크립트를 함께 확인하세요. `scripts/add-diamond.mjs` 등 서버별 도구는 초기 단일 서버 생성기와 별도로 관리합니다.
