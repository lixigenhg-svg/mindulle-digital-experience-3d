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
      </article>
    </main>
  );
}
