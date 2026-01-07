'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Share2 } from 'lucide-react';

interface FeedItemProps {
    user: {
        _id: string;
        username: string;
        avatar: string;
        bio: string;
        photos: { url: string; _id?: string }[];
    };
}

export default function FeedItem({ user }: FeedItemProps) {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    const nextPhoto = () => {
        if (currentPhotoIndex < user.photos.length - 1) {
            setCurrentPhotoIndex(prev => prev + 1);
        }
    };

    const prevPhoto = () => {
        if (currentPhotoIndex > 0) {
            setCurrentPhotoIndex(prev => prev - 1);
        }
    };

    const currentPhoto = user.photos[currentPhotoIndex];

    if (!currentPhoto) return null; // Should not happen if filtered correctly

    return (
        <article className="flex flex-col bg-card border border-border rounded-lg overflow-hidden mb-8 shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-3 p-3 bg-secondary/30">
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-border bg-muted">
                    {user.avatar ? (
                         <Image 
                            src={user.avatar} 
                            alt={user.username} 
                            fill 
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-bold">
                            {user.username?.[0]?.toUpperCase()}
                        </div>
                    )}
                </div>
                <span className="font-semibold text-foreground text-sm">{user.username}</span>
            </div>

            {/* Media Carousel */}
            <div className="w-full relative aspect-[4/5] bg-black group"> 
                {/* Keep backend black for media to standout, or use bg-muted */}
                <Image 
                    src={currentPhoto.url} 
                    alt={`${user.username} photo`} 
                    fill 
                    className="object-contain" // Contain ensures whole image is seen
                    unoptimized
                />

                {/* Navigation Arrows */}
                {user.photos.length > 1 && (
                    <>
                        {currentPhotoIndex > 0 && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        
                        {currentPhotoIndex < user.photos.length - 1 && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                            >
                                <ChevronRight size={24} />
                            </button>
                        )}

                        {/* Dots Indicator */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {user.photos.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentPhotoIndex ? 'bg-primary' : 'bg-white/40'}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-col p-4 gap-2 bg-card">
                 <div className="flex gap-4 text-foreground">
                    <button className="hover:text-red-500 transition">
                        <Heart className="w-6 h-6" />
                    </button>
                    <button className="hover:text-blue-500 transition">
                        <MessageCircle className="w-6 h-6" />
                    </button>
                    <button className="hover:text-green-500 transition">
                        <Share2 className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Caption / Bio */}
                <div className="text-sm">
                    <span className="font-semibold text-foreground mr-2">{user.username}</span>
                    <span className="text-muted-foreground">{user.bio || 'No bio yet.'}</span>
                </div>
            </div>
        </article>
    );
}
