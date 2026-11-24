import React, { lazy, Suspense, useRef, useState } from 'react';
import { RainbowMemorialScene } from './RainbowMemorialScene';
import './memorial.css';
import './lulu-demo.css';

const RainbowMemorialDialog = lazy(() => import('./RainbowMemorialDialog.jsx'));

const photos = [
  { id: 'lulu-01', url: '/assets/lulu/01.webp' },
  { id: 'lulu-02', url: '/assets/lulu/02.webp' },
  { id: 'lulu-03', url: '/assets/lulu/03.webp' },
  { id: 'lulu-04', url: '/assets/lulu/04.webp' },
  { id: 'lulu-05', url: '/assets/lulu/05.webp' },
];

export default function LuluDemo() {
  const [creating, setCreating] = useState(false);
  const createButton = useRef(null);

  return (
    <main className="lulu-demo" lang="ko">
      <header>
        <a href="/">민들레 안심케어</a>
      </header>
      <article>
        <p className="lulu-eyebrow">무지개다리 3D 추모관</p>
        <h1>루루의 추모관</h1>
        <p className="lulu-intro">함께한 순간을 오래 기억하는 곳</p>
        <div className="lulu-create">
          <button ref={createButton} type="button" onClick={() => setCreating(true)}>
            내 반려동물 추모관 만들기
          </button>
          <p>휴대전화 인증 후 사진 5장까지 담아 무료로 만들 수 있어요.</p>
        </div>
        <RainbowMemorialScene room={{ petName: '루루', message: '함께한 순간을 오래 기억하는 곳', photos }} />
        <details open className="lulu-guide mx-auto mt-5 max-w-xl rounded-xl border border-white/15 bg-black/20 p-4 text-left">
          <summary className="cursor-pointer font-semibold text-amber-100">이용 안내</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed">
            <li>누구나 로그인이나 결제 없이 루루의 사진 5장을 볼 수 있어요.</li>
            <li>화면을 마우스나 손가락으로 드래그해 둘러보세요. 「정면 보기」를 누르면 처음 각도로 돌아와요.</li>
            <li>액자나 「사진 크게 보기」 버튼을 누르세요. 확대 화면에서 좌우로 밀거나 「이전」「다음」을 눌러 다른 사진을 볼 수 있어요.</li>
          </ol>
        </details>
      </article>
      {creating && (
        <Suspense fallback={<p className="lulu-create-loading" role="status">추모관을 여는 중이에요…</p>}>
          <RainbowMemorialDialog open initialCreate onClose={() => {
            setCreating(false);
            createButton.current?.focus();
          }} />
        </Suspense>
      )}
    </main>
  );
}
