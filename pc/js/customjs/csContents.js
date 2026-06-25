// 1. 함수 정의: 현재 헤더의 실제 높이를 컨테이너 패딩에 적용
const adjustContainerPadding = () => {
  const header = document.querySelector('#header');
  const container = document.querySelector('#container');

  if (header && container) {
    const currentHeight = header.offsetHeight;
    container.style.transition = 'padding-top 0.2s ease-in-out';
    container.style.paddingTop = `${currentHeight}px`;
  }
};

// 2. ResizeObserver: 헤더의 높이 변화를 실시간으로 감시 (배너 닫힘, 창 크기 조절 모두 포함)
const headerElement = document.querySelector('#header');
if (headerElement) {
  const ro = new ResizeObserver(() => {
    adjustContainerPadding();
  });
  ro.observe(headerElement);
}

// 3. 배너 닫기 버튼 로직 (배너를 제거하면 ResizeObserver가 이를 감지하여 padding을 줄입니다)
const closeBannerBtn = document.querySelector('.top_banner_close');
const headerLineBanner = document.querySelector('.main_top_banner');

if (closeBannerBtn && headerLineBanner) {
  closeBannerBtn.addEventListener('click', () => {
    headerLineBanner.style.display = 'none'; // 배너를 숨김 -> 헤더 높이 변화 -> Observer가 감지하여 패딩 수정
  });
}

// 초기 실행
adjustContainerPadding();