'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api'; // Ensure this path is correct based on your setup
import FeedItem from './FeedItem';

interface FeedUser {
    _id: string;
    username: string;
    avatar: string;
    bio: string;
    photos: { url: string; _id?: string }[];
}

const Feed = () => {
    const [feedUsers, setFeedUsers] = useState<FeedUser[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const loaderRef = useRef(null);

    const fetchFeed = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);

        try {
            const { data } = await api.get(`/users/feed?page=${page}&limit=5`);
            const newUsers = data.data;

            if (newUsers.length === 0) {
                setHasMore(false);
            } else {
                setFeedUsers(prev => {
                    // Avoid duplicates
                    const existingIds = new Set(prev.map(u => u._id));
                    const uniqueNew = newUsers.filter((u: any) => !existingIds.has(u._id));
                    return [...prev, ...uniqueNew];
                });
                setPage(prev => prev + 1);
            }
        } catch (error) {
            console.error('Failed to fetch feed', error);
        } finally {
            setLoading(false);
        }
    }, [page, loading, hasMore]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !loading) {
                fetchFeed();
            }
        }, { threshold: 0.1, rootMargin: '100px' }); // Trigger before full view

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => observer.disconnect();
    }, [fetchFeed, hasMore, loading]);

    // Initial load
    useEffect(() => {
        if (page === 1) fetchFeed();
    }, []);

    return (
        <div className="flex flex-col w-full max-w-xl mx-auto pb-10">
            {feedUsers.length === 0 && !loading ? (
                <div className="text-center py-20 text-zinc-500">
                    <p>No posts found.</p>
                    <p className="text-sm mt-2">Follow users or complete your profile to see content.</p>
                </div>
            ) : (
                feedUsers.map((user) => (
                    <FeedItem key={user._id} user={user} />
                ))
            )}
            
            {/* Loader */}
            <div ref={loaderRef} className="flex justify-center p-4">
                {loading && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>}
                {!hasMore && feedUsers.length > 0 && (
                    <div className="text-zinc-600 text-sm">You've reached the end!</div>
                )}
            </div>
        </div>
    );
};

export default Feed;
