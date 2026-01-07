
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
    <div className={`relative group w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${photo.isProfile ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-zinc-800 hover:border-zinc-600'}`}>
      <Image
        src={photo.url}
        alt="User photo"
        fill
        className="object-cover"
      />
      
      {/* Overlay Actions */}
      {/* Overlay Actions */}
      {!readOnly && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
            <div className="flex justify-end">
                <button
                    onClick={() => onDelete?.(photo._id)}
                    className="p-1.5 bg-zinc-900/80 rounded-full hover:bg-red-500/80 text-white transition-colors"
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
                        className="px-3 py-1 bg-blue-600/90 rounded-full text-xs font-medium hover:bg-blue-700 text-white backdrop-blur-sm transition-colors flex items-center gap-1"
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
        <div className="absolute top-2 left-2 bg-blue-500 text-white p-1 rounded-full shadow-md z-10 group-hover:opacity-0 transition-opacity">
            <Star size={14} fill="white" />
        </div>
      )}
    </div>
  );
}
