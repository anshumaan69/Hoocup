
import Image from 'next/image';
import { X, Star, Check, Trash2, UserRound } from 'lucide-react';

interface PhotoCardProps {
  photo: {
    _id: string;
    url?: string;
    isProfile: boolean;
    restricted?: boolean;
  };
  onSetProfile?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRequestAccess?: () => void;
  isPending?: boolean;
  readOnly?: boolean;
}

export default function PhotoCard({ photo, onSetProfile, onDelete, onRequestAccess, isPending, readOnly = false }: PhotoCardProps) {
  return (
    <div className={`relative group w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${photo.isProfile ? 'border-primary shadow-lg shadow-primary/20' : 'border-border hover:border-muted-foreground/50'}`}>
      {photo.restricted ? (
            <div className="w-full h-full bg-zinc-900 border-none flex flex-col items-center justify-center relative p-4">
                 <div className="absolute inset-0 bg-white/5" />
                 <div className="z-10 flex flex-col items-center gap-2 text-center">
                    <span className="text-2xl">🔒</span>
                    {onRequestAccess && (
                        <button 
                            onClick={onRequestAccess}
                            disabled={isPending}
                            className={`mt-1 px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${isPending ? 'bg-secondary/50 text-muted-foreground border-transparent cursor-default' : 'bg-primary/20 text-primary hover:bg-primary/30 border-primary/50'}`}
                        >
                            {isPending ? 'Pending' : 'Request'}
                        </button>
                    )}
                 </div>
            </div>
      ) : (
          <Image
            src={photo.url || ''}
            alt="User photo"
            fill
            className="object-cover"
          />
      )}
      
      {/* Overlay Actions */}
      {!readOnly && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
            <div className="flex justify-end">
                <button
                    onClick={() => onDelete?.(photo._id)}
                    className="p-1.5 bg-black/60 rounded-full hover:bg-destructive text-white transition-colors"
                    title="Delete Photo"
                    type="button"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="flex justify-center">
                {!photo.isProfile && (
                    <button
                        onClick={() => onSetProfile?.(photo._id)}
                        className="px-3 py-1 bg-primary/90 rounded-full text-xs font-medium hover:bg-primary text-primary-foreground backdrop-blur-sm transition-colors flex items-center gap-1"
                        type="button"
                    >
                        <UserRound size={12} />
                        Set Profile
                    </button>
                )}
            </div>
        </div>
      )}

      {/* Persistent Badge for Profile Photo */}
      {photo.isProfile && (
        <div className="absolute top-2 left-2 bg-primary text-primary-foreground p-1 rounded-full shadow-md z-10 group-hover:opacity-0 transition-opacity">
            <Star size={14} fill="currentColor" />
        </div>
      )}
    </div>
  );
}
