import { useState, useRef } from 'react';
import { Upload, Loader2, Plus } from 'lucide-react';
import PhotoCard from './PhotoCard';
import axios from 'axios';

interface Photo {
  _id: string;
  url: string;
  publicId: string;
  isProfile: boolean;
  order: number;
}

interface PhotoUploadGridProps {
  photos: Photo[];
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  updateProfilePhotoLocal: (url: string) => void;
}

export default function PhotoUploadGrid({ photos, setPhotos, updateProfilePhotoLocal }: PhotoUploadGridProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const files = Array.from(e.target.files);
    if (photos.length + files.length > 4) {
      alert(`You can only upload ${4 - photos.length} more photos.`);
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    files.forEach(file => formData.append('photos', file));

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('access_token='));
      // Basic CSRF handling if needed, usually handled by HttpOnly cookie auto-send but header might be needed.
       // We rely on standard browser cookie behavior + withCredentials
      const res = await axios.post('/api/auth/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'x-csrf-token': getCsrfToken() },
        withCredentials: true
      });

      setPhotos(res.data.photos);
      if (res.data.profilePhoto) updateProfilePhotoLocal(res.data.profilePhoto);
      
    } catch (error: any) {
      console.error('Upload failed', error);
      alert(error.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetProfile = async (photoId: string) => {
    try {
      const res = await axios.patch('/api/auth/photos/set-profile', { photoId }, {
        headers: { 'x-csrf-token': getCsrfToken() },
        withCredentials: true
      });
       setPhotos(res.data.photos);
       updateProfilePhotoLocal(res.data.profilePhoto);
    } catch (error) {
      console.error('Failed to set profile photo', error);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm('Delete this photo?')) return;
    try {
      const res = await axios.delete(`/api/auth/photos/${photoId}`, {
         headers: { 'x-csrf-token': getCsrfToken() },
         withCredentials: true
      });
      setPhotos(res.data.photos);
      updateProfilePhotoLocal(res.data.profilePhoto || '');
    } catch (error) {
      console.error('Failed to delete photo', error);
    }
  };

  // Helper to extract CSRF token from cookies (if accessible) or meta tag
  const getCsrfToken = () => {
      // In our implementation, we made csrf_token cookie readable (httpOnly: false)
      const match = document.cookie.match(new RegExp('(^| )csrf_token=([^;]+)'));
      if (match) return match[2];
      return '';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
      {photos.map((photo, index) => (
        <PhotoCard
          key={photo._id || photo.publicId || index}
          photo={photo}
          onSetProfile={handleSetProfile}
          onDelete={handleDelete}
        />
      ))}

      {photos.length < 4 && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-500 transition-all flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-white group disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          {isUploading ? (
            <Loader2 className="animate-spin text-blue-500" />
          ) : (
            <>
              <div className="p-3 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors">
                <Plus size={24} />
              </div>
              <span className="text-sm font-medium">Add Photo</span>
            </>
          )}
        </button>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />
    </div>
  );
}
