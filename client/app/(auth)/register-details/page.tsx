'use client';

import { Suspense, useState, useEffect } from 'react';
import api from '../../services/api';
import { useRouter, useSearchParams } from 'next/navigation';

export function RegisterDetailsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        dob: '',
        username: ''
    });

    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // No manual token check needed
    // Middleware and cookies handle auth state

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            validateImage(file);
            setAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
        } catch (error: any) {
            alert(error.message);
        }
    };

    function validateImage(file: File) {
      if (!file.type.startsWith("image/")) {
        throw new Error("Only images allowed");
      }
    
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Max 5MB allowed");
      }
    }

    const handleGenerateUsername = () => {
        const base = formData.first_name ? formData.first_name.toLowerCase().replace(/\s/g, '') : 'user';
        const random = Math.floor(Math.random() * 10000);
        setFormData({ ...formData, username: `${base}${random}` });
    };

    async function convertToWebP(file: File): Promise<Blob> {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
    
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0, 512, 512);
    
      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob!),
          "image/webp",
          0.8
        );
      });
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Client-side Age Validation
        const birthDate = new Date(formData.dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age < 10) {
            alert('You must be at least 10 years old.');
            return;
        }

        setUploading(true);
        try {
            let avatarUrl = null;
            if (avatar) {
                // 1. Convert to WebP
                const webpImage = await convertToWebP(avatar);

                // 2. Get Signed URL
                const { data } = await api.get('/avatar/upload-url');
                const { uploadUrl, filePath } = data;

                // 3. Upload to GCS
                await fetch(uploadUrl, {
                    method: 'PUT',
                    body: webpImage,
                    headers: {
                        'Content-Type': 'image/webp'
                    }
                });
                
                // 4. Save Avatar using dedicated endpoint (as requested)
                await api.post("/avatar/save", { filePath });

                // Construct URL for register details fallback (though saveAvatar updates the user too)
                avatarUrl = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_GCP_BUCKET_NAME}/${filePath}`;
            }

            // Still call register-details to update text fields
            // We pass avatarUrl just in case, or if the backend controller logic needs it contextually
            await api.post('/register-details', { ...formData, avatar: avatarUrl });
            router.push('/home');
        } catch (error: any) {
            console.error('Registration failed', error);
            const data = error.response?.data || {};
            const msg = data.message || 'Failed to update details';
            const debugInfo = data.error ? `\nError: ${data.error}` : '';
            alert(`${msg}${debugInfo}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
             <div className="w-full max-w-md border border-zinc-800 p-8 rounded-lg bg-zinc-900/50">
                <h1 className="text-3xl font-bold mb-6 text-center">Complete Your Profile</h1>
                <p className="text-zinc-400 mb-8 text-center">One last step to join the community.</p>
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    
                    {/* Avatar Selection */}
                    <div className="flex flex-col items-center mb-4">
                        <div className="w-24 h-24 rounded-full bg-zinc-800 mb-2 overflow-hidden border border-zinc-700 relative">
                             {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                             ) : (
                                <div className="flex items-center justify-center h-full text-zinc-500 text-xs">No Image</div>
                             )}
                        </div>
                        <label className="cursor-pointer bg-zinc-800 px-3 py-1 rounded text-sm hover:bg-zinc-700">
                            Upload Avatar
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                        </label>
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
                        {uploading ? 'Uploading...' : 'Finish Setup'}
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
