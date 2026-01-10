'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface MediaViewerProps {
    isOpen: boolean;
    onClose: () => void;
    initialIndex: number;
    photos: { url?: string; _id?: string; restricted?: boolean }[];
}

export default function MediaViewer({ isOpen, onClose, initialIndex, photos }: MediaViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    // Reset index when opening with a new initialIndex
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
        }
    }, [isOpen, initialIndex]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') showPrev();
            if (e.key === 'ArrowRight') showNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, currentIndex]); // currentIndex dependency added for closure freshness if needed, though state setter handles it

    const showNext = useCallback(() => {
        setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : prev));
    }, [photos.length]);

    const showPrev = useCallback(() => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }, []);

    if (!isOpen) return null;

    const currentPhoto = photos[currentIndex];

    if (!currentPhoto) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-50"
            >
                <X size={32} />
            </button>

            {/* Navigation - Left */}
            {photos.length > 1 && (
                <button 
                    onClick={(e) => { e.stopPropagation(); showPrev(); }}
                    className={`absolute left-4 p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                >
                    <ChevronLeft size={48} />
                </button>
            )}

            {/* Main Image */}
            <div 
                className="relative w-full h-full max-w-7xl max-h-[90vh] mx-4 flex items-center justify-center"
                onClick={(e) => e.stopPropagation()} // Prevent close on image click
            >
                {currentPhoto.restricted ? (
                     <div className="flex flex-col items-center gap-4 p-8 bg-zinc-900/80 rounded-2xl backdrop-blur-xl border border-white/10">
                        <div className="p-4 bg-white/10 rounded-full backdrop-blur-md">
                            <span className="text-4xl">🔒</span> 
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-2">Photo Restricted</h3>
                            <p className="text-zinc-400 max-w-xs">You need to request access from the user to view this photo.</p>
                        </div>
                     </div>
                ) : (
                    <Image
                        src={currentPhoto.url || ''}
                        alt="Full screen media"
                        fill
                        className="object-contain"
                        unoptimized
                        priority
                    />
                )}
            </div>

            {/* Navigation - Right */}
            {photos.length > 1 && (
                <button 
                    onClick={(e) => { e.stopPropagation(); showNext(); }}
                    className={`absolute right-4 p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all ${currentIndex === photos.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                >
                    <ChevronRight size={48} />
                </button>
            )}

            {/* Counter / Dots */}
            {photos.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    {photos.map((_, idx) => (
                        <div 
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-colors ${idx === currentIndex ? 'bg-white' : 'bg-white/30'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
