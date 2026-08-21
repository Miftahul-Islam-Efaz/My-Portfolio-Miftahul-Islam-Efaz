import React from 'react';
import { Github, Linkedin, Twitter, Instagram, Facebook } from 'lucide-react';
import { AnimatedDock } from '../ui/animated-dock';
import { HERO_CONFIG } from './heroData';

const ICON_MAP: Record<string, React.ReactNode> = {
  GitHub: <Github size={22} />,
  LinkedIn: <Linkedin size={22} />,
  Twitter: <Twitter size={22} />,
  Instagram: <Instagram size={22} />,
  Facebook: <Facebook size={22} />,
};

export const HeroSocialDock: React.FC = () => {
  const items = HERO_CONFIG.socialLinks.map((item) => ({
    link: item.link,
    target: item.target,
    Icon: ICON_MAP[item.label] || <Github size={22} />,
    label: item.label,
  }));

  return (
    <div className="hero-element flex relative z-10">
      <AnimatedDock items={items} />
    </div>
  );
};

export default HeroSocialDock;
