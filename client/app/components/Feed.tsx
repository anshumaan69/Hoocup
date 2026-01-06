"use client";

import React, { useState } from 'react';
import Image from 'next/image';

interface Post {
    id: number;
    username: string;
    avatar: string;
    type: 'image' | 'video';
    src: string;
    caption: string;
    likes: number;
    isVideo?: boolean; 
}

// Hardcoded data with 25 posts
const POSTS: Post[] = [
    {
        id: 1,
        username: "josh_travels",
        avatar: "https://i.pravatar.cc/150?u=josh",
        type: 'image',
        src: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2073&auto=format&fit=crop",
        caption: "Paris vibes 🇫🇷✨ #travel #paris",
        likes: 1240
    },
    {
        id: 2,
        username: "gym_rat_99",
        avatar: "https://i.pravatar.cc/150?u=gym",
        type: 'video',
        src: "https://videos.pexels.com/video-files/3249935/3249935-uhd_2560_1440_25fps.mp4",
        caption: "Never skip leg day! 🏋️‍♂️💪 #fitness #motivation",
        likes: 856
    },
    {
        id: 3,
        username: "foodie_delight",
        avatar: "https://i.pravatar.cc/150?u=food",
        type: 'image',
        src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1981&auto=format&fit=crop",
        caption: "Best pizza in town! 🍕😋 #foodporn #pizza",
        likes: 3402
    },
    {
        id: 4,
        username: "tech_guru",
        avatar: "https://i.pravatar.cc/150?u=tech",
        type: 'image',
        src: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop",
        caption: "New setup update! 💻🖥️ #setup #tech",
        likes: 5600
    },
    {
        id: 5,
        username: "nature_lover",
        avatar: "https://i.pravatar.cc/150?u=nature",
        type: 'video',
        src: "https://videos.pexels.com/video-files/855564/855564-hd_1920_1080_24fps.mp4",
        caption: "Peaceful forest sounds 🌲🍃 #nature #relax",
        likes: 980
    },
    {
        id: 6,
        username: "artistic_soul",
        avatar: "https://i.pravatar.cc/150?u=art",
        type: 'image',
        src: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=2071&auto=format&fit=crop",
        caption: "My latest painting 🎨🖌️ #art #creative",
        likes: 1120
    },
    {
        id: 7,
        username: "puppy_love",
        avatar: "https://i.pravatar.cc/150?u=pup",
        type: 'image',
        src: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=1974&auto=format&fit=crop",
        caption: "Good boy! 🐶❤️ #dog #puppy",
        likes: 4500
    },
    {
        id: 8,
        username: "skater_boi",
        avatar: "https://i.pravatar.cc/150?u=skate",
        type: 'video',
        src: "https://videos.pexels.com/video-files/3009772/3009772-hd_1920_1080_30fps.mp4",
        caption: "Learning new tricks 🛹🤙 #skate #skateboarding",
        likes: 720
    },
    {
        id: 9,
        username: "coffee_addict",
        avatar: "https://i.pravatar.cc/150?u=coffee",
        type: 'image',
        src: "https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=1974&auto=format&fit=crop",
        caption: "First coffee of the day ☕☀️ #coffee #morning",
        likes: 2100
    },
    {
        id: 10,
        username: "mountain_hiker",
        avatar: "https://i.pravatar.cc/150?u=hike",
        type: 'image',
        src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop",
        caption: "Views from the top 🏔️🙌 #hiking #adventure",
        likes: 3300
    },
     {
        id: 11,
        username: "ocean_girl",
        avatar: "https://i.pravatar.cc/150?u=ocean",
        type: 'video',
        src: "https://videos.pexels.com/video-files/1409899/1409899-hd_1920_1080_25fps.mp4",
        caption: "Waves crashing 🌊🐚 #beach #ocean",
        likes: 1450
    },
    {
        id: 12,
        username: "city_lights",
        avatar: "https://i.pravatar.cc/150?u=city",
        type: 'image',
        src: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2144&auto=format&fit=crop",
        caption: "City that never sleeps 🌃🚖 #city #nightlife",
        likes: 2900
    },
    {
        id: 13,
        username: "car_obsessed",
        avatar: "https://i.pravatar.cc/150?u=car",
        type: 'image',
        src: "https://images.unsplash.com/photo-1503376763036-066120622c74?q=80&w=2070&auto=format&fit=crop",
        caption: "Dream drive 🏎️💨 #cars #speed",
        likes: 4100
    },
    {
        id: 14,
        username: "fashion_ista",
        avatar: "https://i.pravatar.cc/150?u=fashion",
        type: 'image',
        src: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
        caption: "OOTD 👗👠 #fashion #style",
        likes: 3600
    },
    {
        id: 15,
        username: "plant_mom",
        avatar: "https://i.pravatar.cc/150?u=plant",
        type: 'image',
        src: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?q=80&w=2148&auto=format&fit=crop",
        caption: "My green babies 🌿🌵 #plants #indoorplants",
        likes: 1800
    },
    {
        id: 16,
        username: "book_worm",
        avatar: "https://i.pravatar.cc/150?u=book",
        type: 'image',
        src: "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?q=80&w=2071&auto=format&fit=crop",
        caption: "Current read 📚🤓 #books #reading",
        likes: 2200
    },
    {
        id: 17,
        username: "music_maker",
        avatar: "https://i.pravatar.cc/150?u=music",
        type: 'video',
        src: "https://videos.pexels.com/video-files/2450325/2450325-hd_1920_1080_30fps.mp4",
        caption: "Jamming session 🎸🎵 #music #guitar",
        likes: 1560
    },
    {
        id: 18,
        username: "baker_chef",
        avatar: "https://i.pravatar.cc/150?u=baker",
        type: 'image',
        src: "https://images.unsplash.com/photo-1483695028939-5bb13f86d78d?q=80&w=2069&auto=format&fit=crop",
        caption: "Freshly baked! 🎂🍰 #baking #cake",
        likes: 3100
    },
    {
        id: 19,
        username: "snow_boarder",
        avatar: "https://i.pravatar.cc/150?u=snow",
        type: 'image',
        src: "https://images.unsplash.com/photo-1520207588543-1e545b20c19e?q=80&w=2071&auto=format&fit=crop",
        caption: "Powder day ❄️🏂 #snowboarding #winter",
        likes: 1950
    },
    {
        id: 20,
        username: "sunset_chaser",
        avatar: "https://i.pravatar.cc/150?u=sunset",
        type: 'image',
        src: "https://images.unsplash.com/photo-1472120435266-53112dc2de39?q=80&w=1974&auto=format&fit=crop",
        caption: "Golden hour 🌅✨ #sunset #beautiful",
        likes: 4200
    },
    {
        id: 21,
        username: "retro_coder",
        avatar: "https://i.pravatar.cc/150?u=coder",
        type: 'image',
        src: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop",
        caption: "Coding late night 💻🌙 #coding #developer",
        likes: 2750
    },
    {
        id: 22,
        username: "dance_life",
        avatar: "https://i.pravatar.cc/150?u=dance",
        type: 'video',
        src: "https://videos.pexels.com/video-files/5385966/5385966-hd_1920_1080_25fps.mp4",
        caption: "Dance like nobody's watching 💃🕺 #dance #fun",
        likes: 1600
    },
    {
        id: 23,
        username: "minimalist_design",
        avatar: "https://i.pravatar.cc/150?u=mini",
        type: 'image',
        src: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=2067&auto=format&fit=crop",
        caption: "Less is more ⚪⚫ #minimalism #design",
        likes: 2300
    },
    {
        id: 24,
        username: "gamer_pro",
        avatar: "https://i.pravatar.cc/150?u=game",
        type: 'image',
        src: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop",
        caption: "Level up! 🎮🕹️ #gaming #esports",
        likes: 3800
    },
    {
        id: 25,
        username: "cat_lady",
        avatar: "https://i.pravatar.cc/150?u=cat",
        type: 'image',
        src: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2053&auto=format&fit=crop",
        caption: "Meow! 🐱😺 #cat #cute",
        likes: 5100
    }
];

const Feed = () => {
    return (
        <div className="flex flex-col gap-8 w-full max-w-xl mx-auto pb-10">
            {POSTS.map((post) => (
                <article key={post.id} className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-3 p-3">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-700">
                             <Image 
                                src={post.avatar} 
                                alt={post.username} 
                                fill 
                                className="object-cover"
                            />
                        </div>
                        <span className="font-semibold text-white text-sm">{post.username}</span>
                    </div>

                    {/* Media */}
                    <div className="w-full relative aspect-[4/5] bg-black">
                        {post.type === 'video' ? (
                            <video 
                                src={post.src} 
                                controls 
                                className="w-full h-full object-cover" 
                                poster={post.src + '#t=1.0'}
                                playsInline
                            />
                        ) : (
                            <Image 
                                src={post.src} 
                                alt={post.caption} 
                                fill 
                                className="object-cover"
                                unoptimized // Allow external URLs easily for demo
                            />
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col p-4 gap-2">
                        <div className="flex gap-4 text-white">
                             {/* Heart Icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 cursor-pointer hover:text-red-500 transition">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                            </svg>
                            {/* Comment Icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 cursor-pointer hover:text-blue-500 transition">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                            </svg>
                            {/* Share Icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 cursor-pointer hover:text-green-500 transition">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5" />
                            </svg>
                        </div>
                        
                        <div className="font-semibold text-sm text-white">{post.likes.toLocaleString()} likes</div>
                        
                        <div className="text-sm">
                            <span className="font-semibold text-white mr-2">{post.username}</span>
                            <span className="text-zinc-300">{post.caption}</span>
                        </div>
                    </div>
                </article>
            ))}
        </div>
    );
};

export default Feed;
