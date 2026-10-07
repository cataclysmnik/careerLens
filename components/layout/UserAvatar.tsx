import { initials } from '@/lib/roles';

export function UserAvatar({
  name,
  email,
  image,
  size = 36,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: number;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name, email)}
    </div>
  );
}
