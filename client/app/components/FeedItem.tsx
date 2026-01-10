'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import MediaViewer from './MediaViewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';

interface FeedItemProps {
    user: {
        _id: string;
        username: string;
        avatar: string;
        bio: string;
        photos: { url?: string; _id?: string; restricted?: boolean }[];
    };
}

export default function FeedItem({ user }: FeedItemProps) {
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    const onPhotoClick = (index: number, restricted?: boolean) => {
        if (!restricted) {
            setViewerIndex(index);
            setIsViewerOpen(true);
        }
    };

    return (
        <Card className="mb-8 border-border bg-card overflow-hidden shadow-sm hover:shadow-primary/5 transition-shadow">
            {/* Header */}
            <div className="flex items-center gap-3 p-4">
                <Link href={`/${user.username}`} className="relative w-10 h-10 rounded-full overflow-hidden border border-border bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                    {user.avatar ? (
                         <Image 
                            src={user.avatar} 
                            alt={user.username} 
                            fill 
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground font-bold">
                            {user.username?.[0]?.toUpperCase()}
                        </div>
                    )}
                </Link>
                <div className="flex flex-col">
                    <Link href={`/${user.username}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                        {user.username}
                    </Link>
                    <span className="text-xs text-muted-foreground">Suggested for you</span>
                </div>
            </div>

            {/* Media Carousel */}
            <div className="relative w-full aspect-[4/5] bg-black">
                <Carousel className="w-full h-full">
                    <CarouselContent className="h-full ml-0">
                        {user.photos.map((photo, index) => (
                            <CarouselItem key={index} className="pl-0 h-full relative group">
                                {photo.restricted ? (
                                    <div className="w-full h-full relative overflow-hidden">
                                        {/* Blurred Background: Uses the ACTUAL restricted image (blurred by backend) */}
                                        <Image
                                            src={photo.url || '/default-avatar.png'} // Backend now sends the blurred URL here
                                            alt="Restricted Content"
                                            fill
                                            className="object-cover blur-md scale-110 opacity-60" // Add smooth blur on top of the pixelated backend blur
                                            unoptimized
                                        />
                                        
                                        {/* Dark Overlay for contrast */}
                                        <div className="absolute inset-0 bg-black/40" />

                                        {/* Restricted Overlay */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                                            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 backdrop-blur-md border border-white/20 shadow-lg">
                                                <span className="text-3xl drop-shadow-md">🔒</span>
                                            </div>
                                            <h3 className="text-white font-bold text-lg mb-1 tracking-tight drop-shadow-md">Private Photo</h3>
                                            <p className="text-white/80 text-sm mb-4 font-medium drop-shadow-md">Request access to view</p>
                                            <Link href={`/${user.username}`}>
                                                <Button size="sm" className="rounded-full bg-white/20 hover:bg-white/30 text-white border-white/10 backdrop-blur-md shadow-lg transition-all hover:scale-105">
                                                    Request Access
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        className="w-full h-full relative cursor-pointer"
                                        onClick={() => onPhotoClick(index, photo.restricted)}
                                    >
                                        <Image 
                                            src={photo.url || ''} 
                                            alt={`${user.username} photo`} 
                                            fill 
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                            unoptimized
                                        />
                                    </div>
                                )}
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {user.photos.length > 1 && (
                        <>
                            <CarouselPrevious className="left-2 bg-black/50 border-none text-white hover:bg-black/70 decoration-clone" />
                            <CarouselNext className="right-2 bg-black/50 border-none text-white hover:bg-black/70" />
                        </>
                    )}
                </Carousel>
            </div>

            {/* Actions */}
            <div className="flex flex-col p-4 gap-3">
                 <div className="flex gap-4">
                    <Button variant="ghost" size="icon" className="hover:text-pink-500 hover:bg-pink-500/10">
                        <Heart className="w-6 h-6" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:text-blue-500 hover:bg-blue-500/10">
                        <MessageCircle className="w-6 h-6" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:text-green-500 hover:bg-green-500/10 ml-auto">
                        <Share2 className="w-6 h-6" />
                    </Button>
                </div>
                
                {/* Caption / Bio */}
                <div className="text-sm">
                    <Link href={`/${user.username}`} className="font-semibold text-foreground mr-2 hover:text-primary transition-colors">
                        {user.username}
                    </Link>
                    <span className="text-muted-foreground">{user.bio || 'No bio yet.'}</span>
                </div>
            </div>

            <MediaViewer 
                isOpen={isViewerOpen}
                onClose={() => setIsViewerOpen(false)}
                initialIndex={viewerIndex}
                photos={user.photos}
            />
        </Card>
    );
}
