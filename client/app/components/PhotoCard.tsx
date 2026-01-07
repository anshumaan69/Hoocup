
import Image from 'next/image';
import { X, Star, Check, Trash2, UserRound } from 'lucide-react';

interface PhotoCardProps {
  photo: {
    _id: string;
    url: string;
    isProfile: boolean;
  };
  onSetProfile?: (id: string) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

export default function PhotoCard({ photo, onSetProfile, onDelete, readOnly = false }: PhotoCardProps) {
  return (
    <div className={`relative group w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${photo.isProfile ? 'border-primary shadow-lg shadow-primary/20' : 'border-border hover:border-muted-foreground/50'}`}>
      <Image
        src={photo.url}
        alt="User photo"
        fill
        className="object-cover"
      />
      
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
