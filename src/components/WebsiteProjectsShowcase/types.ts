export interface ProjectItem {
  id: string;
  title: string;
  category?: string;
  accentColor: string;
  badge: string;
  tech: string[];
  description: string;
  linkText: string;
  linkUrl: string;
  glow?: string;
}
