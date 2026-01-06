'use client';

import { Suspense, useEffect, useState } from 'react';
import api from '../services/api';
import { useRouter, useParams } from 'next/navigation';

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

    useEffect(() => {
        // Fetch Profile Data
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
             } catch (error) {
                 console.error('Failed to fetch profile', error);
             }
        };

        // Fetch Me (for ownership check)
        const fetchMe = async () => {
             try {
                const res = await api.get('/me');
                setCurrentUser(res.data);
             } catch (e) {
                // Not logged in or error
             }
        };

        Promise.all([fetchProfile(), fetchMe()]).finally(() => setLoading(false));
    }, [username]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Basic Validation Reuse
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
      // Draw white background mainly for transparent PNGs converted to WebP (optional but good)
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

            // 1. Upload Avatar if changed
            if (avatar) {
                const compressedBlob = await compressImage(avatar);
                const formData = new FormData();
                formData.append("avatar", compressedBlob);

                // Use fetch directly for FormData to avoid Content-Type header issues with axios wrappers if not handled automatically
                // But our api client sets Content-Type: application/json by default.
                // It's safer to use api.post with Content-Type: multipart/form-data OR just let axios handle it by passing FormData.
                // However, our api interceptor might force JSON.
                // Let's use axios instance 'api' but override headers.
                
                const res = await api.post('/avatar', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' } 
                });
                
                avatarUrl = res.data.avatar; 
            }

            // 2. Update other details
            const res = await api.post('/register-details', { ...formData, avatar: avatarUrl });
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

    if (loading) return <div className="flex justify-center items-center h-screen bg-black text-white">Loading...</div>;
    if (!profile) return <div className="flex justify-center items-center h-screen bg-black text-white">User not found</div>;

    const isOwner = currentUser && currentUser.username === profile.username;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-8">
            <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl relative">
                
                {/* Header / Avatar */}
                <div className="flex flex-col items-center mb-8">
                     <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-zinc-800 relative group">
                        <img 
                            src={avatarPreview || profile.avatar || '/default-avatar.png'} 
                            alt={profile.username} 
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${profile.first_name}&background=random`; }}
                        />
                        {isEditing && (
                             <label className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs">Change</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                             </label>
                        )}
                     </div>

                     {isEditing ? (
                        <div className="flex gap-2 mb-2 w-full justify-center">
                            <input name="first_name" value={formData.first_name} onChange={handleChange} className="bg-zinc-800 p-2 rounded text-center w-32" placeholder="First Name" />
                            <input name="last_name" value={formData.last_name} onChange={handleChange} className="bg-zinc-800 p-2 rounded text-center w-32" placeholder="Last Name" />
                        </div>
                     ) : (
                        <h1 className="text-3xl font-bold">{profile.first_name} {profile.last_name}</h1>
                     )}
                     
                     <p className="text-zinc-400">@{profile.username}</p>
                     
                     {isEditing ? (
                         <textarea 
                            name="bio" 
                            value={formData.bio} 
                            onChange={(e) => handleChange(e as any)} 
                            className="bg-zinc-800 p-2 rounded w-full mt-4 text-center h-20 resize-none" 
                            placeholder="Bio..."
                            maxLength={150} 
                        />
                     ) : (
                        <p className="text-zinc-300 mt-2 text-center max-w-sm">{profile.bio}</p>
                     )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-zinc-800/50 p-4 rounded-lg">
                        <span className="text-zinc-500 text-sm block mb-1">Email {isOwner ? '(Private)' : ''}</span>
                        {isOwner ? (
                             <span className="text-lg">{currentUser?.email || 'N/A'}</span>
                        ) : (
                             <span className="text-lg blur-sm select-none">Hidden</span>
                        )}
                    </div>
                    <div className="bg-zinc-800/50 p-4 rounded-lg">
                         <span className="text-zinc-500 text-sm block mb-1">Date of Birth</span>
                         {isEditing ? (
                            <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="bg-zinc-700 text-white p-1 rounded w-full" />
                         ) : (
                            <span className="text-lg">{profile.dob ? new Date(profile.dob).toLocaleDateString() : 'N/A'}</span>
                         )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-4">
                    {isOwner && !isEditing && (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="bg-blue-600 px-6 py-2 rounded-full font-semibold hover:bg-blue-700"
                        >
                            Edit Profile
                        </button>
                    )}
                    {isOwner && isEditing && (
                        <>
                            <button 
                                onClick={handleSave}
                                disabled={uploading}
                                className="bg-green-600 px-6 py-2 rounded-full font-semibold hover:bg-green-700 disabled:opacity-50"
                            >
                                {uploading ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="bg-zinc-600 px-6 py-2 rounded-full font-semibold hover:bg-zinc-700"
                            >
                                Cancel
                            </button>
                        </>
                    )}
                     <button 
                        onClick={() => router.push('/home')}
                        className="bg-zinc-800 px-6 py-2 rounded-full font-semibold hover:bg-zinc-700"
                    >
                        Back Home
                    </button>
                </div>

            </div>
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
