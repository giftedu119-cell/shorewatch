# 파도지킴이

해변 생물 사진을 Teachable Machine 모델로 분석하고, 안전 정보·개인 도감·위험 표시를 제공하는 정적 웹앱입니다.

## GitHub Pages 배포

1. GitHub에서 비어 있는 저장소를 만듭니다. 예: `shorewatch`
2. 이 폴더를 그 저장소에 올립니다.
3. GitHub 저장소의 **Settings → Pages → Build and deployment**에서 Source를 **GitHub Actions**로 선택합니다.
4. `main` 브랜치에 파일을 올리면 Actions가 자동 배포합니다.

배포 주소는 보통 `https://깃허브아이디.github.io/shorewatch/` 형식입니다.

## 주의 사항

- Teachable Machine 모델과 TensorFlow.js 라이브러리를 인터넷에서 불러오므로, 방문자는 인터넷 연결이 필요합니다.
- 개인 도감과 위험 표시는 각 사용자 브라우저의 localStorage에 저장됩니다. 다른 사용자의 기기와 자동 공유되지는 않습니다.
