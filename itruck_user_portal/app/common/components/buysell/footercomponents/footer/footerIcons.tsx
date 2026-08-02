/** lucide-react has no brand marks — small inline SVGs instead */
type IconProps = { size?: number };

export function FacebookIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}

export function InstagramIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function YoutubeIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.8 15.3V8.7l6 3.3-6 3.3Z" />
      <path
        d="M23 12s0-3.2-.4-4.73a3 3 0 0 0-2.1-2.1C18.9 4.75 12 4.75 12 4.75s-6.9 0-8.5.42a3 3 0 0 0-2.1 2.1C1 8.8 1 12 1 12s0 3.2.4 4.73a3 3 0 0 0 2.1 2.1c1.6.42 8.5.42 8.5.42s6.9 0 8.5-.42a3 3 0 0 0 2.1-2.1C23 15.2 23 12 23 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function LinkedinIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5C4.98 4.88 3.9 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.24 8.25h4.5V23h-4.5V8.25ZM8.5 8.25h4.31v2.01h.06c.6-1.13 2.07-2.32 4.26-2.32 4.55 0 5.39 3 5.39 6.9V23h-4.5v-6.94c0-1.66-.03-3.79-2.31-3.79-2.32 0-2.67 1.81-2.67 3.68V23H8.5V8.25Z" />
    </svg>
  );
}

export function WhatsappIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.91-2.2-.24-.58-.48-.5-.67-.5-.17 0-.37-.02-.57-.02-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.08 3.18 5.04 4.46.7.3 1.25.48 1.68.62.7.22 1.34.19 1.84.12.56-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
      <path d="M12.04 2C6.58 2 2.13 6.42 2.13 11.85c0 1.87.52 3.6 1.42 5.09L2 22l5.2-1.52a10.06 10.06 0 0 0 4.84 1.24h.01c5.46 0 9.9-4.42 9.9-9.86C21.96 6.42 17.5 2 12.04 2Zm0 18.05h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.09.9.9-2.99-.2-.31a8.09 8.09 0 0 1-1.26-4.47c0-4.47 3.66-8.11 8.16-8.11 2.18 0 4.22.85 5.76 2.38a8.05 8.05 0 0 1 2.38 5.75c0 4.47-3.65 8.18-8.16 8.18Z" />
    </svg>
  );
}
