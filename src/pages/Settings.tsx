import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { User, Phone, MapPin, Building, Save, Camera, Scissors, DollarSign, Users, Shield, Info, RefreshCw, Mail, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { safeToast } from '@/lib/errorHandler';
import { ProviderVerification } from '@/components/ProviderVerification';
import { Link } from 'react-router-dom';

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

export default function Settings() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
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

  const defaultTab = searchParams.get('tab') || 'profile';

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

    setSaving(true);
    try {
      let uploadedAvatarUrl = profile.avatar_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/avatar.${fileExt}`;

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
          phone_number: profile.phone_number || null,
          address: profile.address || null,
          company_name: profile.company_name || null,
          avatar_url: uploadedAvatarUrl,
          bio: profile.bio || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, avatar_url: uploadedAvatarUrl }));
      setAvatarFile(null);
      toast.success('Profile updated successfully!');
    } catch (error) {
      safeToast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const isProvider = profile.user_role === 'provider' || profile.user_role === 'both';

  const features = [
    {
      icon: Scissors,
      title: 'Easy Job Posting',
      description: 'Customers post lawn cutting jobs with photos, location, and preferred scheduling.',
    },
    {
      icon: Users,
      title: 'Connect Providers',
      description: 'Service providers browse available jobs and submit proposals based on their expertise.',
    },
    {
      icon: DollarSign,
      title: 'Secure Transactions',
      description: 'Customers pay upfront, funds held securely until job completion is confirmed.',
    },
    {
      icon: Shield,
      title: 'Trust & Safety',
      description: 'Rate and review system ensures quality service and builds community trust.',
    },
  ];

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue={defaultTab} onValueChange={(value) => setSearchParams({ tab: value })}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="refunds">Refunds</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
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

            {/* Provider Bio */}
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
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  About LawnConnect
                </CardTitle>
                <CardDescription>
                  Jamaica's trusted marketplace connecting homeowners with professional lawn care providers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h3 className="text-lg font-semibold mb-3">Our Mission</h3>
                <p className="text-muted-foreground leading-relaxed">
                  LawnConnect was created to make finding and providing lawn care services simple and secure in Jamaica. 
                  We connect homeowners who need quality lawn maintenance with skilled service providers looking for work. 
                  With secure payments and a trusted review system, 
                  we're building a community where both customers and providers succeed.
                </p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-primary/5">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3">Why Choose LawnConnect?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We provide a safe, transparent platform for both customers and service providers. 
                  With escrow payments and verified reviews, LawnConnect ensures 
                  quality service and fair compensation. Join Jamaica's growing community of satisfied 
                  homeowners and professional lawn care providers.
                </p>
              </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                By using LawnConnect, you agree to our{' '}
                <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>,{' '}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, and{' '}
                <Link to="/refund-policy" className="text-primary hover:underline">Refund & Cancellation Policy</Link>.
              </p>
            </div>
          </TabsContent>

          {/* Refunds Tab */}
          <TabsContent value="refunds" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Refund & Cancellation Policy
                </CardTitle>
                <CardDescription>
                  Understanding our refund and cancellation process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold mb-2">Customer Cancellations</h3>
                    <p className="text-sm text-muted-foreground">
                      You can cancel a job request within 24 hours of posting for a full refund, 
                      provided no provider has accepted the job yet.
                    </p>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold mb-2">Provider Cancellations</h3>
                    <p className="text-sm text-muted-foreground">
                      If a provider cancels after accepting your job, you will receive a full refund 
                      automatically and the job will be reopened for other providers.
                    </p>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold mb-2">Quality Issues</h3>
                    <p className="text-sm text-muted-foreground">
                      If you're unsatisfied with the completed work, you have 48 hours to report 
                      the issue and request a review. Our team will investigate and determine 
                      appropriate resolution.
                    </p>
                  </div>

                  <div className="border-l-4 border-warning pl-4">
                    <h3 className="font-semibold mb-2">Processing Time</h3>
                    <p className="text-sm text-muted-foreground">
                      Approved refunds are processed within 14 business days and returned to 
                      your original payment method.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request a Refund</CardTitle>
                <CardDescription>
                  Need to request a refund or have questions about a past transaction?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Email Us</p>
                    <a 
                      href="mailto:officiallawnconnect@gmail.com?subject=Refund Request" 
                      className="text-primary hover:underline text-sm"
                    >
                      officiallawnconnect@gmail.com
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      Include your job ID and reason for the refund request
                    </p>
                  </div>
                </div>

                <Link to="/refund-policy">
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Refund Policy
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
