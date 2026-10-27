import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Ilustración de DiceBear para los avatares "persona:Nombre" y el avatar por defecto. */
export function dicebearUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;
}

interface Props {
  /** "default", "persona:Nombre" o un emoji. */
  avatar: string;
  name: string;
  className?: string;
}

/** Avatar de un jugador, igual en el perfil, el inicio y la Arena. */
const PlayerAvatar = ({ avatar, name, className }: Props) => {
  if (avatar === "default" || avatar.startsWith("persona:")) {
    const seed = avatar === "default" ? name : avatar.slice("persona:".length);
    return (
      <Avatar className={cn("bg-black", className)}>
        <AvatarImage src={dicebearUrl(seed)} alt="" />
        <AvatarFallback className="bg-zinc-900 text-zinc-100 font-bold">{name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
    );
  }
  return (
    <div
      className={cn("rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center", className)}
      aria-hidden
    >
      {avatar}
    </div>
  );
};

export default PlayerAvatar;
