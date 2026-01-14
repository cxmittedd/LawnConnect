import { useEffect, useState, useRef } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { User, Phone, MapPin, Building, Save, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { safeToast } from '@/lib/errorHandler';
import { ProviderVerification } from '@/components/ProviderVerification';

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  address: string | null;
  company_name: string | null;
  user_role: string;
  avatar_url: string | null;
  bio: string | null;
}

export default function Profile() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    phone_number: '',
    address: '',
    company_name: '',
    user_role: 'customer',
    avatar_url: null,
    bio: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          first_name: (data as any).first_name || '',
          last_name: (data as any).last_name || '',
          phone_number: data.phone_number || '',
          address: data.address || '',
          company_name: data.company_name || '',
          user_role: data.user_role || 'customer',
          avatar_url: data.avatar_url || null,
          bio: (data as any).bio || null,
        });
        setAvatarPreview(data.avatar_url || null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;

    const normalizePhoneToE164 = (input: string): string | null => {
      const digits = input.replace(/\D/g, "");
      if (digits.length === 10) return `+1${digits}`;
      if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
      if (digits.length === 12 && digits.startsWith("1876")) return `+${digits}`;
      if (input.trim().startsWith("+") && /^\+1\d{10}$/.test(input.trim())) return input.trim();
      return null;
    };

    const normalizedPhone = profile.phone_number?.trim()
      ? normalizePhoneToE164(profile.phone_number)
      : null;

    if (profile.phone_number?.trim() && !normalizedPhone) {
      toast.error("Please enter a valid Jamaican number (e.g., 876-555-1234).");
      return;
    }

    setSaving(true);
    try {
      let uploadedAvatarUrl = profile.avatar_url;

      // Upload avatar if new file selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/avatar.${fileExt}`;

        // Remove old avatars
        await supabase.storage.from('avatars').remove([
          `${user.id}/avatar.jpg`,
          `${user.id}/avatar.png`,
          `${user.id}/avatar.jpeg`,
          `${user.id}/avatar.webp`,
        ]);

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        uploadedAvatarUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          phone_number: normalizedPhone,
          address: profile.address || null,
          company_name: profile.company_name || null,
          avatar_url: uploadedAvatarUrl,
          bio: profile.bio || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, avatar_url: uploadedAvatarUrl, phone_number: normalizedPhone || '' }));
      setAvatarFile(null);
      toast.success('Profile updated successfully!');
    } catch (error) {
      safeToast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const isProvider = profile.user_role === 'provider' || profile.user_role === 'both';

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">
            Update your personal information and payment details
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Photo - Required for Providers */}
          {isProvider && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Profile Photo
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                </CardTitle>
                <CardDescription>
                  Upload a clear face photo to help customers recognize you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarPreview || undefined} alt="Profile photo" />
                    <AvatarFallback className="text-2xl">
                      <User className="h-10 w-10" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Max 5MB. JPG, PNG, or WebP format.
                    </p>
                    {!profile.avatar_url && !avatarFile && (
                      <p className="text-xs text-destructive">
                        A profile photo is required to apply for jobs
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Your personal details visible to other users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="flex items-center gap-2">
                    First Name
                    <Badge variant="secondary" className="text-xs font-normal">Locked</Badge>
                  </Label>
                  <Input
                    id="first_name"
                    value={profile.first_name || ''}
                    readOnly
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="flex items-center gap-2">
                    Last Name
                    <Badge variant="secondary" className="text-xs font-normal">Locked</Badge>
                  </Label>
                  <Input
                    id="last_name"
                    value={profile.last_name || ''}
                    readOnly
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Your name is set during signup and cannot be changed as it must match your legal ID documents for verification.
              </p>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone_number"
                    placeholder="e.g., 876-555-1234"
                    className="pl-10"
                    value={profile.phone_number || ''}
                    onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                  />
                </div>
              </div>

              {/* Address field only shown for customers - providers don't need to share their address */}
              {!isProvider && (
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="address"
                      placeholder="Your address"
                      className="pl-10"
                      value={profile.address || ''}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {isProvider && (
                <div className="space-y-2">
                  <Label htmlFor="company_name">Business/Company Name (Optional)</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company_name"
                      placeholder="Your business name"
                      className="pl-10"
                      value={profile.company_name || ''}
                      onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Provider Bio - Required for Providers */}
          {isProvider && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  About You
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                </CardTitle>
                <CardDescription>
                  Tell customers about yourself and your lawn care experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  id="bio"
                  placeholder="Tell customers about yourself, your experience with lawn care, equipment you use, and why they should choose you..."
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={5}
                  className="resize-none"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{(profile.bio?.length || 0)}/500 characters</span>
                  <span>Minimum 20 characters</span>
                </div>
                {!profile.bio && (
                  <p className="text-xs text-destructive">
                    A bio is required to apply for jobs
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Account Type</span>
                <Badge variant="secondary">
                  {profile.user_role.charAt(0).toUpperCase() + profile.user_role.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Provider Verification */}
          {isProvider && <ProviderVerification />}

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </main>
    </>
  );
}
