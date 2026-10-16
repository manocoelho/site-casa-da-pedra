import type { SVGProps } from "react";

/** Ícones de linha (24x24, stroke = currentColor). */
type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, className = "size-5", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export const ChevronLeftIcon = (p: IconProps) => (
  <BaseIcon {...p}><path d="m15 18-6-6 6-6" /></BaseIcon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <BaseIcon {...p}><path d="m9 18 6-6-6-6" /></BaseIcon>
);

export const ArrowDownIcon = (p: IconProps) => (
  <BaseIcon {...p}><path d="M12 5v14M19 12l-7 7-7-7" /></BaseIcon>
);

export const MapPinIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </BaseIcon>
);

export const UsersIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </BaseIcon>
);

export const ImageIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
  </BaseIcon>
);

export const MailIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </BaseIcon>
);

export const InstagramIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.5 6.5h.01" />
  </BaseIcon>
);

export const WhatsAppIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M3 21l1.65-3.8A9 9 0 1 1 7.8 20.4L3 21Z" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Zm0 0a5 5 0 0 0 5 5m0 0h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1Z" />
  </BaseIcon>
);

export const TrashIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
  </BaseIcon>
);

export const PlusIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M12 5v14M5 12h14" />
  </BaseIcon>
);

export const CheckIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M20 6 9 17l-5-5" />
  </BaseIcon>
);

export const ShieldIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </BaseIcon>
);

export const PencilIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </BaseIcon>
);

export const ExternalLinkIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
  </BaseIcon>
);

export const CalendarIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M8 2v4M16 2v4M3 10h18" />
    <rect x="3" y="4" width="18" height="18" rx="2" />
  </BaseIcon>
);

export const ClockIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </BaseIcon>
);

export const StarIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </BaseIcon>
);

export const StarFilledIcon = ({ className = "size-5", ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const SparklesIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </BaseIcon>
);

export const SendIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </BaseIcon>
);

export const ChatIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </BaseIcon>
);

export const UserIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </BaseIcon>
);

export const SearchIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </BaseIcon>
);

export const BellIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </BaseIcon>
);

export const Volume2Icon = (p: IconProps) => (
  <BaseIcon {...p}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </BaseIcon>
);

export const VolumeXIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="22" y1="9" x2="16" y2="15" />
    <line x1="16" y1="9" x2="22" y2="15" />
  </BaseIcon>
);

export const RefreshIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </BaseIcon>
);

export const CopyIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </BaseIcon>
);

export const LinkIcon = (p: IconProps) => (
  <BaseIcon {...p}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </BaseIcon>
);
