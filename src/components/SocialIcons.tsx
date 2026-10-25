import React from 'react';
import { Facebook, Instagram } from 'lucide-react';
import { SocialChannel } from '../types';

export const TikTokIcon: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 15,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.01 1.62 4.14.99 1.13 2.37 1.83 3.84 2.01v3.98c-1.42-.02-2.83-.37-4.11-1.02-.78-.4-1.48-.95-2.05-1.63V15.5c-.01 2.22-.9 4.34-2.48 5.86-1.58 1.52-3.76 2.32-5.98 2.21-2.41-.12-4.66-1.4-5.88-3.5-1.22-2.09-1.29-4.71-.16-6.86 1.12-2.14 3.32-3.53 5.75-3.64v3.95c-1.12.06-2.17.69-2.73 1.67-.56.97-.56 2.18-.01 3.16.55.98 1.58 1.63 2.7 1.7 1.16.07 2.29-.41 2.97-1.35.53-.73.74-1.64.74-2.54V.02h.64z" />
  </svg>
);

export const renderSocialIcon = (id: SocialChannel['id'], size = 15) => {
  switch (id) {
    case 'facebook':
      return <Facebook size={size} />;
    case 'instagram':
      return <Instagram size={size} />;
    case 'tiktok':
      return <TikTokIcon size={size} />;
  }
};

export const getSocialButtonStyle = (id: SocialChannel['id']) => {
  switch (id) {
    case 'facebook':
      return 'bg-[#1877F2] hover:bg-[#155fc0] text-white';
    case 'instagram':
      return 'bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F56040] hover:opacity-95 text-white';
    case 'tiktok':
      return 'bg-slate-950 hover:bg-black text-white border border-slate-700/80';
  }
};
