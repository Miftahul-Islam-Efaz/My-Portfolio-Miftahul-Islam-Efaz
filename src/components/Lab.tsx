import React, { useRef } from 'react';
import { FullScreenScrollFX, FullScreenFXAPI } from './ui/full-screen-scroll-fx';

const articles = [
  { id: '01', title: 'Building Autonomous Agents with n8n', category: 'Automation', year: '2025', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop' },
  { id: '02', title: 'The Art of Prompt Engineering', category: 'AI / LLMs', year: '2025', image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2065&auto=format&fit=crop' },
  { id: '03', title: 'Why Every Business Needs a Chatbot', category: 'Chatbots', year: '2024', image: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=2006&auto=format&fit=crop' },
  { id: '04', title: 'Vibe Coding: Where AI Meets Creativity', category: 'Web Dev', year: '2024', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop' }
];

const sections = articles.map(article => ({
  leftLabel: article.id,
  title: <>{article.title}</>,
  rightLabel: article.category,
  background: article.image,
}));

export default function Lab() {
  const apiRef = useRef<FullScreenFXAPI>(null);

  return (
    <section id="lab" className="w-full">
      <FullScreenScrollFX
        apiRef={apiRef}
        sections={sections}
        header={<><div>Lab / Blog</div></>}
        footer={<div></div>}
        showProgress
        durations={{ change: 0.7, snap: 800 }}
        smoothScroll={true}
        colors={{
          text: "var(--color-pearl)",
          overlay: "rgba(0,0,0,0.6)",
          pageBg: "var(--color-eerie)",
          stageBg: "var(--color-eerie)",
        }}
        fontFamily="var(--font-serif)"
      />
    </section>
  );
}
