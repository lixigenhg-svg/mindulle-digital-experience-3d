import React from 'react';
import { RainbowMemorialScene } from './RainbowMemorialScene';
import './memorial.css';
import './lulu-demo.css';

const photos = [
  { id: 'lulu-01', url: '/assets/lulu/01.webp' },
  { id: 'lulu-02', url: '/assets/lulu/02.webp' },
  { id: 'lulu-03', url: '/assets/lulu/03.webp' },
  { id: 'lulu-04', url: '/assets/lulu/04.webp' },
  { id: 'lulu-05', url: '/assets/lulu/05.webp' },
];

export default function LuluDemo() {
  return (
    <main className="lulu-demo" lang="ko">
      <header>
        <a href="/">민들레 안심케어</a>
      </header>
      <article>
        <p className="lulu-eyebrow">무지개다리 3D 추모관</p>
        <h1>루루의 추모관</h1>
        <p className="lulu-intro">함께한 순간을 오래 기억하는 곳</p>
        <RainbowMemorialScene room={{ petName: '루루', message: '함께한 순간을 오래 기억하는 곳', photos }} />
        <p className="lulu-guide">화면을 드래그해 둘러보고, 사진을 누르면 크게 볼 수 있어요.</p>
        <section className="lulu-custom" aria-labelledby="lulu-custom-title">
          <img src="/assets/lulu/full-body-preview.webp" alt="받침대 위에 네 발로 서 있는 루루의 전신 3D 모델" loading="lazy" width="800" height="870" />
          <div>
            <h2 id="lulu-custom-title">반려동물 전신 3D 피규어 맞춤 제작</h2>
            <p>사진을 바탕으로 얼굴과 털색, 몸과 꼬리까지 담아 우리 아이의 전신 피규어를 만듭니다.</p>
            <p>정면과 양옆, 몸 전체가 보이는 사진을 준비해 주세요. 사진 확인 후 제작 가능 여부와 크기, 비용, 소요 시간을 안내해 드립니다.</p>
            <p className="lulu-sample-note">이미지는 루루의 3D 모델 시안입니다. 실물 출력은 아직 진행하지 않았습니다.</p>
            <a href="tel:07041221731">맞춤 제작 문의 · 070-4122-1731</a>
          </div>
        </section>
      </article>
    </main>
  );
}
