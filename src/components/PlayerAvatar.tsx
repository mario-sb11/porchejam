import { useEffect, useState } from "react";
import { isEmojiAvatar } from "@/lib/avatars";
import { cn } from "@/lib/utils";

interface Props {
  /** Texto del avatar: ver src/lib/avatars.ts (ilustración o emoji). */
  avatar: string;
  name: string;
  className?: string;
}

// El dibujo (DiceBear) se carga aparte para no engordar la carga inicial de la app.
let renderer: Promise<typeof import("@/lib/avatarRender")> | null = null;
const loadRenderer = () => (renderer ??= import("@/lib/avatarRender"));

/** Avatar de un jugador, igual en el perfil, el inicio, las estadísticas y la Arena. */
const PlayerAvatar = ({ avatar, name, className }: Props) => {
  const emoji = isEmojiAvatar(avatar);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (emoji) return;
    let active = true;
    loadRenderer()
      .then(async (mod) => {
        const cached = mod.cachedAvatarImage(avatar, name);
        if (cached) return cached;
        return mod.renderAvatar(avatar, name);
      })
      .then((uri) => active && setSrc(uri))
      .catch(() => active && setSrc(null));
    return () => {
      active = false;
    };
  }, [avatar, name, emoji]);

  if (emoji) {
    return (
      <div
        className={cn("rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0", className)}
        aria-hidden
      >
        {avatar}
      </div>
    );
  }
  return (
    <div className={cn("rounded-full overflow-hidden bg-white/10 shrink-0", className)}>
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-zinc-300 font-bold animate-pulse" aria-hidden>
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
};

export default PlayerAvatar;
