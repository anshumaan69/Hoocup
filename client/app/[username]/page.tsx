'use client';

import { Suspense, useEffect, useState } from 'react';
import api from '../services/api';
import { useRouter, useParams } from 'next/navigation';
import PhotoUploadGrid from '../components/PhotoUploadGrid';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Image from 'next/image';
import { Heart, MessageCircle, Share2, ArrowLeft, MoreVertical, MapPin, Calendar, Mail, Shield } from 'lucide-react';
import MediaViewer from '../components/MediaViewer';

function ProfileContent() {
    const { username } = useParams();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form State (for editing)
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        username: '',
        dob: '',
        bio: '',
    });
    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    
    // Photo State
    const [photos, setPhotos] = useState<any[]>([]);
    
    // Media Viewer
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    // Access Request State
    const [accessStatus, setAccessStatus] = useState<'none' | 'pending' | 'granted' | 'rejected'>('none');
    const [requestingAccess, setRequestingAccess] = useState(false);

    const updateProfilePhotoLocal = (url: string) => {
        setAvatarPreview(url);
        setProfile((prev: any) => ({ ...prev, avatar: url }));
    };

    useEffect(() => {
        const fetchProfile = async () => {
             try {
                 const res = await api.get(`/users/${username}`);
                 setProfile(res.data);
                 setFormData({
                    first_name: res.data.first_name || '',
                    last_name: res.data.last_name || '',
                    username: res.data.username || '',
                    dob: res.data.dob ? res.data.dob.split('T')[0] : '',
                    bio: res.data.bio || '',
                 });
                 if (res.data.photos) {
                     setPhotos(res.data.photos);
                 }
                 return res.data;
             } catch (error) {
                 console.error('Failed to fetch profile', error);
             }
        };

        const fetchAccessStatus = async (targetId: string) => {
            try {
                const res = await api.get(`/users/photo-access/status/${targetId}`);
                setAccessStatus(res.data.status);
            } catch (error) {
                console.error('Failed to fetch access status', error);
            }
        };

        const fetchMe = async () => {
             try {
                const res = await api.get('/auth/me');
                setCurrentUser(res.data);
             } catch (e) {
                console.error('Fetch Me failed:', e);
             }
        };

        Promise.all([fetchProfile(), fetchMe()]).then(([profileData, _]) => {
             if (profileData && profileData._id) {
                 fetchAccessStatus(profileData._id);
             }
        }).finally(() => setLoading(false));
    }, [username]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
         if (!file.type.startsWith("image/")) {
            alert("Only images allowed");
            return;
         }
         if (file.size > 5 * 1024 * 1024) {
            alert("Max 5MB allowed");
            return;
         }

        setAvatar(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    async function compressImage(file: File): Promise<Blob> {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(bitmap, 0, 0, 512, 512);
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/webp", 0.8);
      });
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        try {
            let avatarUrl = profile.avatar;
            if (avatar) {
                const compressedBlob = await compressImage(avatar);
                const formData = new FormData();
                formData.append("avatar", compressedBlob);
                
                const res = await api.post('/auth/avatar', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' } 
                });
                avatarUrl = res.data.avatar; 
            }

            const res = await api.post('/auth/register-details', { ...formData, avatar: avatarUrl });
            setProfile(res.data.user);
            setIsEditing(false);
            alert('Profile Updated');
        } catch (error: any) {
             console.error('Update failed', error);
             const data = error.response?.data || {};
             const msg = data.message || 'Failed to update profile';
             alert(msg);
        } finally {
            setUploading(false);
        }
    };

    const handleRequestAccess = async () => {
        if (!profile) return;
        setRequestingAccess(true);
        try {
            await api.post('/users/photo-access/request', { targetUserId: profile._id });
            setAccessStatus('pending');
            alert('Access request sent to admin');
        } catch (error: any) {
            console.error('Request failed', error);
            alert(error.response?.data?.message || 'Failed to request access');
            if (error.response?.data?.message === 'Access request re-submitted') {
                 setAccessStatus('pending');
            }
        } finally {
            setRequestingAccess(false);
        }
    };

    const onPhotoClick = (index: number, restricted?: boolean) => {
        if (!restricted) {
            setViewerIndex(index);
            setIsViewerOpen(true);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen bg-background text-foreground animate-pulse">Loading...</div>;
    if (!profile) return <div className="flex justify-center items-center h-screen bg-background text-foreground">User not found</div>;

    const isOwner = currentUser && (currentUser._id === profile._id || currentUser.username === profile.username);

    return (
        <div className="flex min-h-screen flex-col items-center bg-background text-foreground pb-20">
            {/* Top Bar */}
            <header className="w-full fixed top-0 left-0 bg-background/80 backdrop-blur-md z-50 border-b border-border/50 px-4 py-3 flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => router.push('/home')}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <span className="font-bold text-lg">@{profile.username}</span>
                {isOwner && (
                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
                        <MoreVertical className="w-6 h-6" />
                    </Button>
                )}
                {!isOwner && <div className="w-10" />}
            </header>

            <div className="w-full max-w-md pt-20 px-4 space-y-6">
                
                {/* Profile Header */}
                <div className="flex flex-col items-center">
                     <div className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-primary to-purple-600 mb-4 shadow-xl shadow-primary/20">
                        <div className="w-full h-full rounded-full overflow-hidden border-4 border-black relative group">
                            <img 
                                src={avatarPreview || profile.profilePhoto || profile.avatar || '/default-avatar.png'} 
                                alt={profile.username} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${profile.first_name}&background=random`; }}
                            />
                             {isEditing && (
                                 <label className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs font-bold text-white">CHANGE</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                                 </label>
                            )}
                        </div>
                     </div>

                     {isEditing ? (
                        <div className="flex gap-2 mb-2 w-full justify-center">
                            <Input name="first_name" value={formData.first_name} onChange={handleChange} className="text-center w-32" placeholder="First Name" />
                            <Input name="last_name" value={formData.last_name} onChange={handleChange} className="text-center w-32" placeholder="Last Name" />
                        </div>
                     ) : (
                        <h1 className="text-2xl font-bold text-white">
                            {profile.first_name} {profile.last_name}
                        </h1>
                     )}
                     
                     <div className="flex items-center gap-2 mt-1 mb-4">
                         <span className="px-3 py-1 bg-secondary/50 rounded-full text-xs font-medium text-muted-foreground border border-border">
                             @{profile.username}
                         </span>
                         {accessStatus === 'granted' && (
                             <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-medium border border-green-500/20 flex items-center gap-1">
                                 <Shield size={10} /> Verified Access
                             </span>
                         )}
                     </div>

                     {isEditing ? (
                         <textarea 
                            name="bio" 
                            value={formData.bio} 
                            onChange={handleChange} 
                            className="bg-card border border-input p-3 rounded-xl w-full text-center h-24 resize-none focus:ring-1 focus:ring-primary outline-none transition-all text-sm" 
                            placeholder="Write something about yourself..."
                            maxLength={150} 
                        />
                     ) : (
                        <p className="text-zinc-400 text-center text-sm leading-relaxed max-w-xs cursor-default hover:text-white transition-colors">
                            {profile.bio || "No bio yet."}
                        </p>
                     )}
                     
                     {isOwner && !isEditing && (
                        <div className="mt-4">
                            <Button 
                                onClick={() => setIsEditing(true)}
                                size="sm" 
                                variant="outline" 
                                className="rounded-full px-6 border-white/20 hover:bg-white/10 hover:text-white text-xs uppercase tracking-wide"
                            >
                                Edit Profile
                            </Button>
                        </div>
                     )}
                </div>

                {/* Main Photos Section */}
                {isEditing ? (
                    <Card>
                        <CardContent className="pt-6">
                            <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Manage Photos</h2>
                            <PhotoUploadGrid 
                                photos={photos} 
                                setPhotos={setPhotos} 
                                updateProfilePhotoLocal={updateProfilePhotoLocal} 
                            />
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-black border border-border/50">
                             {photos.length === 0 ? (
                                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                                        <Share2 className="w-6 h-6 opacity-50" />
                                    </div>
                                    <p>No photos uploaded yet</p>
                                </div>
                             ) : (
                                <Carousel className="w-full h-full">
                                    <CarouselContent className="h-full ml-0">
                                        {photos.map((photo, index) => (
                                            <CarouselItem key={index} className="pl-0 h-full relative group">
                                                 {photo.restricted ? (
                                                    <div className="w-full h-full relative overflow-hidden">
                                                        {/* Blurred Background: Uses the ACTUAL restricted image (blurred by backend) */}
                                                        <Image
                                                            src={photo.url || '/default-avatar.png'}
                                                            alt="Restricted Content"
                                                            fill
                                                            className="object-cover blur-md scale-110 opacity-60"
                                                            unoptimized
                                                        />
                                                        
                                                        {/* Dark Overlay */}
                                                        <div className="absolute inset-0 bg-black/40" />
                                                        
                                                        {/* Lock Overlay */}
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                                                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-white/10 to-transparent flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20 shadow-lg">
                                                                <span className="text-4xl filter drop-shadow-md">🔒</span>
                                                            </div>
                                                            <h3 className="text-white font-bold text-xl mb-2 tracking-tight drop-shadow-md">Private Content</h3>
                                                            {accessStatus === 'pending' ? (
                                                                <Button disabled variant="secondary" className="rounded-full px-6 shadow-lg">
                                                                    Request Pending...
                                                                </Button>
                                                            ) : accessStatus === 'rejected' ? (
                                                                <Button disabled variant="destructive" className="rounded-full px-6 shadow-lg">
                                                                    Access Denied
                                                                </Button>
                                                            ) : (
                                                                <Button 
                                                                    onClick={handleRequestAccess}
                                                                    disabled={requestingAccess}
                                                                    className="rounded-full px-8 bg-white text-black hover:bg-white/90 font-bold shadow-lg hover:scale-105 transition-transform"
                                                                >
                                                                    {requestingAccess ? 'Requesting...' : 'Request Access'}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div 
                                                        className="w-full h-full relative cursor-pointer"
                                                        onClick={() => onPhotoClick(index, photo.restricted)}
                                                    >
                                                        <Image 
                                                            src={photo.url || ''} 
                                                            alt={`Photo ${index + 1}`} 
                                                            fill 
                                                            className="object-cover"
                                                            priority={index === 0}
                                                            unoptimized
                                                        />
                                                        {/* Gradient Overlay for style */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                )}
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    {photos.length > 1 && (
                                        <>
                                            <CarouselPrevious className="left-4 bg-black/50 border-white/10 text-white hover:bg-black/70 decoration-clone" />
                                            <CarouselNext className="right-4 bg-black/50 border-white/10 text-white hover:bg-black/70" />
                                        </>
                                    )}
                                </Carousel>
                             )}
                        </div>

                        {/* Interactive Buttons */}
                        <div className="flex justify-center gap-6 py-2">
                             <Button variant="outline" size="lg" className="rounded-full h-14 w-14 p-0 border-2 hover:border-pink-500 hover:text-pink-500 hover:bg-pink-500/10 transition-all shadow-lg">
                                 <Heart className="w-7 h-7" />
                             </Button>
                             <Button variant="outline" size="lg" className="rounded-full h-14 w-14 p-0 border-2 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-500/10 transition-all shadow-lg">
                                 <MessageCircle className="w-7 h-7" />
                             </Button>
                             <Button variant="outline" size="lg" className="rounded-full h-14 w-14 p-0 border-2 hover:border-green-500 hover:text-green-500 hover:bg-green-500/10 transition-all shadow-lg">
                                 <Share2 className="w-7 h-7" />
                             </Button>
                        </div>
                    </div>
                )}

                {/* About Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-secondary/20 border-border/50">
                        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                                <Mail size={16} />
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground uppercase tracking-widest">Email</span>
                                <p className="text-sm font-medium mt-1 truncate max-w-[120px]">
                                    {isOwner || accessStatus === 'granted' ? (currentUser?.email || 'Viewable') : 'Hidden'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-secondary/20 border-border/50">
                         <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500">
                                <Calendar size={16} />
                            </div>
                             <div>
                                <span className="text-xs text-muted-foreground uppercase tracking-widest">Born</span>
                                {isEditing ? (
                                    <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="bg-transparent border-b border-border text-xs w-full text-center mt-1 outline-none" />
                                ) : (
                                    <p className="text-sm font-medium mt-1">
                                        {profile.dob ? new Date(profile.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                    </p>
                                )}
                             </div>
                        </CardContent>
                    </Card>
                </div>

                {isOwner && isEditing && (
                    <div className="flex flex-col gap-3 pt-4">
                        <Button onClick={handleSave} disabled={uploading} className="w-full h-12 text-lg rounded-xl bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/25">
                            {uploading ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button variant="ghost" onClick={() => setIsEditing(false)} className="w-full text-muted-foreground">
                            Cancel
                        </Button>
                    </div>
                )}
            </div>

            <MediaViewer 
                isOpen={isViewerOpen}
                onClose={() => setIsViewerOpen(false)}
                initialIndex={viewerIndex}
                photos={photos}
            />
        </div>
    );
}
export default function ProfilePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProfileContent />
        </Suspense>
    );
}
