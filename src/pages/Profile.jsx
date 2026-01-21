import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Button from '../components/base/Button';

export default function Profile() {
  const {
    user,
    profile,
    profileLoading,
    updateProfile,
    isConfigured,
  } = useAuth();

  const fileInputRef = useRef(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [pendingAvatarName, setPendingAvatarName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const avatarPreviewUrl = avatarUrl
    ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}t=${profile?.updated_at || Date.now()}`
    : '';
  const normalizeText = (value) => value.replace(/\s+/g, ' ').trim();
  const normalizedDisplayName = normalizeText(displayName);
  const normalizedAvatarUrl = avatarUrl.trim();
  const profileDisplayName = normalizeText(profile?.display_name || '');
  const profileAvatarUrl = (profile?.avatar_url || '').trim();
  const isDirty = Boolean(
    pendingAvatarFile ||
    normalizedDisplayName !== profileDisplayName ||
    normalizedAvatarUrl !== profileAvatarUrl
  );

  useEffect(() => {
    setDisplayName(profile?.display_name || '');
    setAvatarUrl(profile?.avatar_url || '');
  }, [profile]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');

    if (!isConfigured) {
      setErrorMessage('Supabase is not configured. Add env vars to enable profiles.');
      return;
    }

    setIsSaving(true);

    try {
      let nextAvatarUrl = avatarUrl.trim() || null;

      if (pendingAvatarFile) {
        if (!supabase) {
          throw new Error('Supabase is not configured. Add env vars to enable uploads.');
        }

        setIsUploading(true);

        const extension = pendingAvatarFile.name.split('.').pop() || 'png';
        const filePath = `${user.id}/avatar.${extension}`;

        const { error: uploadError } = await supabase
          .storage
          .from('avatars')
          .upload(filePath, pendingAvatarFile, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        if (!data?.publicUrl) {
          throw new Error('Unable to fetch avatar URL.');
        }

        nextAvatarUrl = data.publicUrl;
        setAvatarUrl(data.publicUrl);
        setPendingAvatarFile(null);
        setPendingAvatarName('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }

      await updateProfile({
        display_name: displayName.trim() || null,
        avatar_url: nextAvatarUrl,
      });
      setStatusMessage('Profile updated.');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update profile.');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const handleAvatarSelection = (event) => {
    const file = event.target.files?.[0] || null;
    setPendingAvatarFile(file);
    setPendingAvatarName(file ? file.name : '');
  };

  const handleClearAvatarSelection = () => {
    setPendingAvatarFile(null);
    setPendingAvatarName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-gray-600 dark:text-gray-400">
        Loading profile...
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-gray-600 dark:text-gray-400">
        Supabase is not configured. Add env vars to enable profiles.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account details and how your profile appears.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-8 space-y-6">
        <div className="flex items-center gap-4">
          {avatarPreviewUrl ? (
            <img
              src={avatarPreviewUrl}
              alt={displayName ? `${displayName} avatar` : 'Profile avatar'}
              className="h-16 w-16 rounded-full object-cover border border-gray-200 dark:border-gray-700"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xl font-semibold">
              {(displayName || user?.email || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Signed in as</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {user?.email}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        {statusMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-200">
            {statusMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="display-name">
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="avatar-url">
              Avatar URL
            </label>
            <input
              id="avatar-url"
              type="url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://example.com/avatar.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="avatar-upload">
              Upload avatar
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarSelection}
              ref={fileInputRef}
              className="sr-only"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving || isUploading}
              >
                Choose file
              </Button>
              {pendingAvatarFile && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleClearAvatarSelection}
                  disabled={isSaving || isUploading}
                >
                  Clear selected file
                </Button>
              )}
              <span>
                {pendingAvatarName
                  ? `${pendingAvatarName} (uploads on save)`
                  : 'No file selected'}
              </span>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={!isDirty || isSaving || isUploading}>
            {isSaving || isUploading ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      </div>
    </div>
  );
}
