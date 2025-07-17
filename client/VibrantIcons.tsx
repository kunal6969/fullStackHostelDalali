import React, { ReactNode } from 'react';

// Base component for consistent sizing and drop-shadow effect
const VibrantIconBase: React.FC<{ children: ReactNode; className?: string; gradientId: string }> = ({ children, className, gradientId }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke={`url(#${gradientId})`}
    className={`w-6 h-6 ${className || ''}`}
    style={{ filter: `drop-shadow(0 0 5px var(--icon-glow-color))` }}
  >
    {children}
  </svg>
);

// Gradient Definitions, to be rendered once in App.tsx
export const Gradients = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      <linearGradient id="grad-cyan-blue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00FFFF" />
        <stop offset="100%" stopColor="#007BFF" />
      </linearGradient>
      <linearGradient id="grad-fuchsia-purple" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF00FF" />
        <stop offset="100%" stopColor="#8A2BE2" />
      </linearGradient>
      <linearGradient id="grad-lime-teal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#32CD32" />
        <stop offset="100%" stopColor="#008080" />
      </linearGradient>
      <linearGradient id="grad-yellow-orange" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFF00" />
        <stop offset="100%" stopColor="#FFA500" />
      </linearGradient>
      <linearGradient id="grad-red-orange" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF4500" />
        <stop offset="100%" stopColor="#FF8C00" />
      </linearGradient>
      <linearGradient id="grad-pink-red" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF69B4" />
        <stop offset="100%" stopColor="#DC143C" />
      </linearGradient>
       <linearGradient id="grad-gray-light" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D1D5DB" />
        <stop offset="100%" stopColor="#9CA3AF" />
      </linearGradient>
      <linearGradient id="grad-whatsapp-green" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#25D366" />
        <stop offset="100%" stopColor="#128C7E" />
      </linearGradient>
       <linearGradient id="grad-insta" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#833ab4" />
        <stop offset="50%" stopColor="#fd1d1d" />
        <stop offset="100%" stopColor="#fcb045" />
      </linearGradient>
    </defs>
  </svg>
);


// Individual Icons
const withGlow = (IconComponent: React.FC, color: string, gradientId: string): React.FC<{ className?: string }> => {
  return ({ className }) => (
    <div style={{ '--icon-glow-color': color } as React.CSSProperties}>
      <VibrantIconBase className={className} gradientId={gradientId}>
        <IconComponent />
      </VibrantIconBase>
    </div>
  );
};

const HomePath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a.75.75 0 011.06 0l8.955 8.955M3 10.5v.75a4.5 4.5 0 004.5 4.5h7.5a4.5 4.5 0 004.5-4.5v-.75M9 21v-6a3 3 0 013-3h0a3 3 0 013 3v6" />;
export const HomeIcon = withGlow(HomePath, '#00FFFF', 'grad-cyan-blue');

const SearchPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />;
export const SearchIcon = withGlow(SearchPath, '#32CD32', 'grad-lime-teal');

const PlusPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />;
export const PlusIcon = withGlow(PlusPath, '#32CD32', 'grad-lime-teal');

const FirePath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6c.001-.001.002-.001.003-.002A8.25 8.25 0 0112 2.25c.862 0 1.697.122 2.482.351" />;
export const FireIcon = withGlow(FirePath, '#FF4500', 'grad-red-orange');

const ChatBubblePath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.455.09-.934.09-1.423A7.927 7.927 0 013 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />;
export const ChatBubbleIcon = withGlow(ChatBubblePath, '#00FFFF', 'grad-cyan-blue');

const EnvelopePath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />;
export const EnvelopeIcon = withGlow(EnvelopePath, '#FF00FF', 'grad-fuchsia-purple');

const LogoutPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />;
export const LogoutIcon = withGlow(LogoutPath, '#FF69B4', 'grad-pink-red');

const LoginPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12" />;
export const LoginIcon = withGlow(LoginPath, '#32CD32', 'grad-lime-teal');

const SunPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.95-4.243l-1.59-1.591M3.75 12H6m.386-6.364L7.909 7.909M12 12a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />;
export const SunIcon = withGlow(SunPath, '#FFFF00', 'grad-yellow-orange');

const MoonPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />;
export const MoonIcon = withGlow(MoonPath, '#8A2BE2', 'grad-fuchsia-purple');

const PencilPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />;
export const PencilIcon = withGlow(PencilPath, '#00FFFF', 'grad-cyan-blue');

const BrainPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.5 13.5h.008v.008h-.008v-.008z" />;
export const BrainIcon = withGlow(BrainPath, '#FF00FF', 'grad-fuchsia-purple');

const RefreshPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.18-3.185m-3.18-3.182l-3.182-3.182a8.25 8.25 0 00-11.664 0l-3.18 3.185" />;
export const RefreshIcon = withGlow(RefreshPath, '#32CD32', 'grad-lime-teal');

const HandshakePath: React.FC = () => <path d="M14.25 12.75 12.75 15l-1.5-2.25m1.5 2.25L15 12.75M8.25 12.75 9.75 15l1.5-2.25m-1.5 2.25L9 12.75m6-6-3-4.5-3 4.5m6 0-3 4.5-3-4.5M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z" />;
export const HandshakeIcon = withGlow(HandshakePath, '#00FFFF', 'grad-cyan-blue');

const HeartPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />;
export const HeartIcon = withGlow(HeartPath, '#FF00FF', 'grad-fuchsia-purple');

const BrokenHeartPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M12.835 3.04a4.5 4.5 0 00-5.67 5.67l8.33 8.33-8.33-8.33a4.5 4.5 0 005.67-5.67z" />;
export const BrokenHeartIcon = withGlow(BrokenHeartPath, '#FF69B4', 'grad-pink-red');

const CheckmarkPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
export const CheckmarkIcon = withGlow(CheckmarkPath, '#32CD32', 'grad-lime-teal');

const KeyPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />;
export const KeyIcon = withGlow(KeyPath, '#FFFF00', 'grad-yellow-orange');

const RocketPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.82m5.84-2.56a14.98 14.98 0 00-5.84-2.56m5.84 2.56v-4.82a14.98 14.98 0 00-5.84 2.56m5.84-2.56l-3.27-2.02a1.2 1.2 0 00-1.8 1.48l1.47 3.34M12 18.75v-4.82a14.98 14.98 0 015.84-2.56m-5.84 2.56l-3.27 2.02a1.2 1.2 0 01-1.8-1.48l1.47-3.34M12 3.53a15 15 0 010 17.94m0-17.94a15 15 0 000 17.94M12 3.53l-3.27-2.02a1.2 1.2 0 00-1.8 1.48l1.47 3.34" />;
export const RocketIcon = withGlow(RocketPath, '#00FFFF', 'grad-cyan-blue');

const SparklePath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.5 13.5h.008v.008h-.008v-.008z" />;
export const SparkleIcon = withGlow(SparklePath, '#FFFF00', 'grad-yellow-orange');

const BuildingPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h1.5m-1.5 3h1.5m-1.5 3h1.5M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />;
export const BuildingIcon = withGlow(BuildingPath, '#00FFFF', 'grad-cyan-blue');

const ImagePath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />;
export const ImageIcon = withGlow(ImagePath, '#32CD32', 'grad-lime-teal');

const PollPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />;
export const PollIcon = withGlow(PollPath, '#FF00FF', 'grad-fuchsia-purple');

const SendPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />;
export const SendIcon = withGlow(SendPath, '#00FFFF', 'grad-cyan-blue');

const MaskPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.943a.75.75 0 010 1.06l-2.122 2.121a.75.75 0 01-1.061 0l-2.121-2.121a.75.75 0 010-1.061l2.121-2.121a.75.75 0 011.061 0l2.121 2.121zM10.343 3.943l4.243 4.242M10.343 3.943l-4.243 4.242m10.606 5.657a.75.75 0 010 1.06l-2.121 2.122a.75.75 0 01-1.06 0l-2.122-2.122a.75.75 0 010-1.06l2.122-2.121a.75.75 0 011.06 0l2.121 2.121zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
export const MaskIcon = withGlow(MaskPath, '#8A2BE2', 'grad-fuchsia-purple');

const QuestionPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />;
export const QuestionIcon = withGlow(QuestionPath, '#FFFF00', 'grad-yellow-orange');

const MailboxPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9V6.375a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125V3.75m-3.75 0H7.5M9 3.75l-1.5-1.5M13.5 3.75l1.5-1.5M4.5 9.75v10.125a3.375 3.375 0 003.375 3.375h6.75a3.375 3.375 0 003.375-3.375V9.75M8.25 9.75h-3.75M15.75 9.75h3.75" />;
export const MailboxIcon = withGlow(MailboxPath, '#FF00FF', 'grad-fuchsia-purple');

const ClipboardDocumentListPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-.917-.81-1.618-1.745-1.438l-4.5 1.001c-.44.098-.86.323-1.227.649l-4.5 4.5c-.326.326-.551.787-.649 1.227l-1.001 4.5c-.18.935.52 1.745 1.438 1.745H6.75A2.25 2.25 0 009 18.75z" />;
export const ClipboardDocumentListIcon = withGlow(ClipboardDocumentListPath, '#FF00FF', 'grad-fuchsia-purple');

const UsersPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.125-2.257 9.337 9.337 0 00-4.125-2.257 9.38 9.38 0 00-2.625.372M15 19.128v-3.857m0 3.857a9.337 9.337 0 01-4.125-2.257 9.337 9.337 0 014.125-2.257m0 0a9.38 9.38 0 012.625.372M6.375 19.128a9.38 9.38 0 01-2.625-.372 9.337 9.337 0 01-4.125 2.257 9.337 9.337 0 014.125 2.257 9.38 9.38 0 012.625-.372m-4.5-9.345a4.125 4.125 0 100-8.25 4.125 4.125 0 000 8.25zM15 9.75a4.125 4.125 0 100-8.25 4.125 4.125 0 000 8.25z" />;
export const UsersIcon = withGlow(UsersPath, '#32CD32', 'grad-lime-teal');

const UserPlusPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5a3 3 0 01-3 3h-3a3 3 0 01-3-3v0a3 3 0 013-3h3a3 3 0 013 3v0zM12.75 12.75v6.75m-4.5-3.5v3.5m4.5-3.5v3.5M6 15v4.5m-3-12.75a3 3 0 013-3h1.5a3 3 0 013 3v1.5a3 3 0 01-3 3H6a3 3 0 01-3-3v-1.5z" />;
export const UserPlusIcon = withGlow(UserPlusPath, '#00FFFF', 'grad-cyan-blue');

const UserMinusPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M18 12.75H6M15 6.75a3 3 0 01-3 3h-3a3 3 0 01-3-3v0a3 3 0 013-3h3a3 3 0 013 3v0zM21 21v-2.25c0-.965-.67-2.31-2.073-2.835-1.284-.48-2.671-.795-4.127-.966M3 21v-2.25c0-.965.67-2.31 2.073-2.835 1.284-.48 2.671-.795-4.127-.966" />;
export const UserMinusIcon = withGlow(UserMinusPath, '#FF69B4', 'grad-pink-red');

const MessageCirclePath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m2.25 2.25H12M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
export const MessageCircleIcon = withGlow(MessageCirclePath, '#00FFFF', 'grad-cyan-blue');

const AcceptPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
export const AcceptIcon = withGlow(AcceptPath, '#32CD32', 'grad-lime-teal');

const RejectPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />;
export const RejectIcon = withGlow(RejectPath, '#FF69B4', 'grad-pink-red');

const CalendarDaysPath: React.FC = () => <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M12 12.75h.008v.008H12v-.008z" />;
export const CalendarDaysIcon = withGlow(CalendarDaysPath, '#FFFF00', 'grad-yellow-orange');

const WhatsAppPath: React.FC = () => (
    <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.04 19.53C17.31 20.94 14.99 21.5 12.33 21.5c-5.46 0-9.87-4.41-9.87-9.87c0-2.66.96-5.18 2.8-7.09s4.43-2.8 7.07-2.8c5.46 0 9.87 4.41 9.87 9.87c0 2.22-.75 4.33-2.22 6.02l1.64 4.86l-4.28-1.43z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.42 8.82c.1-.38.48-.68.91-.68c.43 0 .8.29.9.67" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.6 11.23c-.3-.21-.68-.21-1.12.03c-1.2.66-2.43.66-3.64 0c-.43-.24-.82-.24-1.12-.03" />
    </>
);
export const WhatsAppIcon = withGlow(WhatsAppPath, '#25D366', 'grad-whatsapp-green');

const InstagramPath: React.FC = () => (
    <>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeLinecap="round" />
    </>
);
export const InstagramIcon = withGlow(InstagramPath, '#fd1d1d', 'grad-insta');