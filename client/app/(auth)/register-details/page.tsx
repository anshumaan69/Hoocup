'use client';

import { Suspense, useState, useEffect } from 'react';
import api from '../../services/api';
import { useRouter, useSearchParams } from 'next/navigation';
import PhotoUploadGrid from '@/app/components/PhotoUploadGrid';

export function RegisterDetailsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        dob: '',
        username: '',
        bio: ''
    });

    const [photos, setPhotos] = useState<any[]>([]); // Using any[] for simplicity with the import interface, or duplicate interface
    const [uploading, setUploading] = useState(false);

    // Fetch existing user data (pre-fill from Google)
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data } = await api.get('/me');
                if (data.is_profile_complete) {
                     // Prevent re-entry to registration details if already complete
                     // Redirect to home or profile
                     router.push('/home'); 
                     return;
                }

                setFormData(prev => ({
                    ...prev,
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    bio: data.bio || ''
                }));
                
                if (data.photos && data.photos.length > 0) {
                    setPhotos(data.photos);
                } else if (data.avatar) {
                    // Backwards compatibility presentation if no photos array yet but avatar exists
                    // We don't push it to photos array here to avoid double upload, 
                    // unless we want to migrate it. For now, let's assume new flow starts fresh or utilizes existing photos.
                }
            } catch (error) {
                console.error('Failed to fetch user data for pre-fill', error);
            }
        };
        fetchUserData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGenerateUsername = () => {
        const base = formData.first_name ? formData.first_name.toLowerCase().replace(/\s/g, '') : 'user';
        const random = Math.floor(Math.random() * 10000);
        setFormData({ ...formData, username: `${base}${random}` });
    };

    const updateProfilePhotoLocal = (url: string) => {
        // This function is passed to the grid to update local state if needed
        // but currently we just rely on the photos array state being updated by the grid
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        // Client-side Age Validation
        const birthDate = new Date(formData.dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age < 10) {
            alert('You must be at least 10 years old to register.');
            setUploading(false);
            return;
        }

        try {
             // photos are already uploaded via the grid component.
             // We just need to submit the rest of the details.
             // The backend will know the current profile photo from the user model.
             // However, for safety/explicitness, we could pass the current profile photo URL,
             // but the controller logic for register-details mostly updates text fields now
             // if we rely on the photo management controllers for photos.
             // Wait, the registerDetails controller accepts 'avatar' field.
             // We should pass the currently selected profile photo as 'avatar' to ensure it syncs 
             // if the backend logic depends on it in registerDetails (it does: `if (avatar) user.avatar = avatar;`)
             
             const profilePhoto = photos.find(p => p.isProfile)?.url;

             await api.post('/register-details', { 
                 username: formData.username,
                 first_name: formData.first_name,
                 last_name: formData.last_name,
                 dob: formData.dob,
                 bio: formData.bio,
                 avatar: profilePhoto 
             });
             router.push('/home');
        } catch (error: any) {
             console.error('Registration failed', error);
             const data = error.response?.data || {};
             const msg = data.message || 'Failed to update details';
             alert(msg);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
             <div className="w-full max-w-2xl border border-zinc-800 p-8 rounded-lg bg-zinc-900/50">
                <h1 className="text-3xl font-bold mb-2 text-center">Complete Your Profile</h1>
                <p className="text-zinc-400 mb-8 text-center">Add your best photos and tell us about yourself.</p>
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    
                    {/* Photo Grid Section */}
                    <div className="flex flex-col gap-2">
                        <label className="block text-sm font-medium text-zinc-300">Photos (Max 4)</label>
                        <PhotoUploadGrid 
                            photos={photos} 
                            setPhotos={setPhotos} 
                            updateProfilePhotoLocal={updateProfilePhotoLocal} 
                        />
                        <p className="text-xs text-zinc-500">
                            Upload up to 4 photos. Click the star icon to set your main profile picture.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1 text-zinc-300">First Name</label>
                            <input 
                                type="text"
                                name="first_name"
                                required
                                className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-blue-500"
                                value={formData.first_name}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1 text-zinc-300">Last Name</label>
                            <input 
                                type="text"
                                name="last_name"
                                required
                                className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-blue-500"
                                value={formData.last_name}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-zinc-300">Username</label>
                        <div className="flex gap-2">
                             <input 
                                type="text"
                                name="username"
                                required
                                className="flex-1 p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-blue-500"
                                value={formData.username}
                                onChange={handleChange}
                            />
                            <button 
                                type="button"
                                onClick={handleGenerateUsername}
                                className="px-3 py-2 bg-zinc-700 rounded hover:bg-zinc-600 text-xs text-white"
                            >
                                Generate
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-zinc-300">Bio <span className="text-zinc-500">(Optional)</span></label>
                         <textarea 
                            name="bio"
                            className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-blue-500 text-white h-20 resize-none"
                            placeholder="Tell us a little about yourself..."
                            value={formData.bio}
                            onChange={handleChange}
                            maxLength={150}
                        />
                    </div>

                    <div>
                         <label className="block text-sm font-medium mb-1 text-zinc-300">Date of Birth</label>
                         <input 
                            type="date"
                            name="dob"
                            required
                            className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-blue-500 text-white"
                            value={formData.dob}
                            onChange={handleChange}
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={uploading}
                        className="mt-4 bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {uploading ? 'Processing...' : 'Finish Setup'}
                    </button>
                </form>
             </div>
        </div>
    );
}

export default function RegisterDetails() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterDetailsContent />
    </Suspense>
  );
}
