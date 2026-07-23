import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { farmerApi } from '../../api/farmer';

interface StepUploadImageProps {
  imageUrl: string | null;
  imageFile: File | null;
  setImageUrl: (url: string | null) => void;
  setImageFile: (file: File | null) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepUploadImage: React.FC<StepUploadImageProps> = ({
  imageUrl,
  setImageUrl,
  setImageFile,
  onNext,
  onBack,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }
    setError(null);
    setImageFile(file);
    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => (prev >= 90 ? 90 : prev + 10));
    }, 100);

    try {
      const response = await farmerApi.uploadImage(file);
      setImageUrl(response.data.image_url);
      clearInterval(progressInterval);
      setUploadProgress(100);
    } catch {
      setError('Failed to upload image. Please try again.');
      setImageFile(null);
      setImageUrl(null);
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImageUrl(null);
    setUploadProgress(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Upload a Photo</h2>
        <p className="text-gray-500">Take or upload a clear picture of the symptoms (optional).</p>
      </div>

      {!imageUrl && !uploading && (
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
            isDragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400 bg-gray-50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            accept="image/*"
            className="hidden"
          />
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Upload className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Drag & drop your image here</h3>
          <p className="text-gray-500">or click to browse</p>
          <p className="text-xs text-gray-400 mt-4">Supports JPG, PNG (Max 10MB)</p>
        </div>
      )}

      {uploading && (
        <div className="border border-gray-200 rounded-2xl p-8 text-center space-y-4">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto animate-pulse" />
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-gray-500 font-medium">Uploading... {uploadProgress}%</p>
        </div>
      )}

      {imageUrl && !uploading && (
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white p-2">
          <div className="relative h-64 w-full rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
            <img src={imageUrl} alt="Uploaded preview" className="object-contain h-full w-full" />
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 p-2 bg-white/90 text-gray-700 hover:text-red-500 rounded-full shadow-sm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center text-sm text-emerald-600 font-medium">
              <ImageIcon className="w-4 h-4 mr-2" />
              Image uploaded successfully
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Change Image
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-center text-sm font-medium">{error}</p>}

      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <div className="space-x-4">
          {!imageUrl && (
            <button
              onClick={onNext}
              className="px-6 py-3 text-gray-500 font-medium hover:text-gray-700 transition-colors"
            >
              Skip
            </button>
          )}
          <button
            onClick={onNext}
            disabled={uploading}
            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </motion.div>
  );
};
