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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { User, Phone, MapPin, Building, Save, Camera, Scissors, DollarSign, Users, Shield, Info, RefreshCw, Mail, ExternalLink, Send } from 'lucide-react';
import { toast } from 'sonner';
import { safeToast } from '@/lib/errorHandler';
import { z } from 'zod';
import { ProviderVerification } from '@/components/ProviderVerification';
import { ProviderBankingForm } from '@/components/ProviderBankingForm';
import { Link } from 'react-router-dom';

interface JobOption {
  id: string;
  title: string;
  created_at: string;
}

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
  const [refundForm, setRefundForm] = useState({
    name: '',
    email: '',
    jobId: '',
    reason: '',
  });
  const [sendingRefund, setSendingRefund] = useState(false);
  const [userJobs, setUserJobs] = useState<JobOption[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const defaultTab = searchParams.get('tab') || 'profile';

  const refundSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name too long'),
    email: z.string().trim().email('Invalid email address').max(255, 'Email too long'),
    jobId: z.string().trim().min(1, 'Job ID is required').max(100, 'Job ID too long'),
    reason: z.string().trim().min(1, 'Reason is required').max(1000, 'Reason too long'),
  });

  useEffect(() => {
    loadProfile();
    loadUserJobs();
  }, [user]);

  const loadUserJobs = async () => {
    if (!user) return;
    
    setLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from('job_requests')
        .select('id, title, created_at')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

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
        const firstName = (data as any).first_name || '';
        const lastName = (data as any).last_name || '';
        setProfile({
          first_name: firstName,
          last_name: lastName,
          phone_number: data.phone_number || '',
          address: data.address || '',
          company_name: data.company_name || '',
          user_role: data.user_role || 'customer',
          avatar_url: data.avatar_url || null,
          bio: (data as any).bio || null,
        });
        setAvatarPreview(data.avatar_url || null);
        
        // Pre-fill refund form with user data
        const fullName = [firstName, lastName].filter(Boolean).join(' ');
        setRefundForm(prev => ({
          ...prev,
          name: fullName,
          email: user?.email || '',
        }));
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

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to submit a refund request');
      return;
    }

    const result = refundSchema.safeParse(refundForm);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setSendingRefund(true);

    try {
      // Insert into database for admin review
      const { error: dbError } = await supabase
        .from('refund_requests')
        .insert({
          customer_id: user.id,
          job_id: refundForm.jobId,
          reason: refundForm.reason,
        });

      if (dbError) throw dbError;

      // Also send email notification
      await supabase.functions.invoke('send-contact-email', {
        body: {
          name: refundForm.name,
          email: refundForm.email,
          subject: `Refund Request - Job ID: ${refundForm.jobId}`,
          message: `Job ID: ${refundForm.jobId}\n\nReason for refund:\n${refundForm.reason}`,
        },
      });

      toast.success('Refund request submitted successfully! We\'ll review and respond soon.');
      setRefundForm({ ...refundForm, jobId: '', reason: '' });
    } catch (error) {
      console.error('Error sending refund request:', error);
      toast.error('Failed to submit refund request. Please try again.');
    } finally {
      setSendingRefund(false);
    }
  };

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
          <TabsList className={`grid w-full ${isProvider ? 'grid-cols-2' : 'grid-cols-3'} mb-6`}>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            {!isProvider && <TabsTrigger value="refunds">Refunds</TabsTrigger>}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Phone Number Alert for existing users */}
            {!loading && !profile.phone_number && (
              <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <Phone className="h-5 w-5" />
                    Phone Number Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-amber-600 dark:text-amber-300 mb-2">
                    A phone number is now required to use secure calling features. Please add your phone number below to enable direct communication with customers and providers through our masked calling system.
                  </p>
                </CardContent>
              </Card>
            )}

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
                  <Label htmlFor="phone_number" className="flex items-center gap-2">
                    Phone Number
                    {!profile.phone_number && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone_number"
                      placeholder="e.g., 876-555-1234"
                      className={`pl-10 ${!profile.phone_number ? 'border-amber-500 focus:ring-amber-500' : ''}`}
                      value={profile.phone_number || ''}
                      onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                    />
                  </div>
                  {!profile.phone_number && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Required for secure calling with customers/providers
                    </p>
                  )}
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

            {/* Provider Banking Details */}
            {isProvider && <ProviderBankingForm />}

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

          {/* Refunds Tab - Only for customers */}
          {!isProvider && (
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

            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Request a Refund</CardTitle>
                  <CardDescription>
                    Fill out the form and we'll review your request
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRefundSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="refund-name">Name</Label>
                      <Input
                        id="refund-name"
                        placeholder="Your name"
                        value={refundForm.name}
                        onChange={(e) => setRefundForm({ ...refundForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="refund-email">Email</Label>
                      <Input
                        id="refund-email"
                        type="email"
                        placeholder="your@email.com"
                        value={refundForm.email}
                        onChange={(e) => setRefundForm({ ...refundForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="refund-jobId">Select Job</Label>
                      <Select
                        value={refundForm.jobId}
                        onValueChange={(value) => setRefundForm({ ...refundForm, jobId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingJobs ? "Loading jobs..." : "Select a job"} />
                        </SelectTrigger>
                        <SelectContent>
                          {userJobs.length === 0 ? (
                            <SelectItem value="no-jobs" disabled>
                              No jobs found
                            </SelectItem>
                          ) : (
                            userJobs.map((job) => (
                              <SelectItem key={job.id} value={job.id}>
                                {job.title} - {new Date(job.created_at).toLocaleDateString()}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="refund-reason">Reason for Refund</Label>
                      <Textarea
                        id="refund-reason"
                        placeholder="Please explain why you're requesting a refund..."
                        value={refundForm.reason}
                        onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                        rows={5}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={sendingRefund}>
                      {sendingRefund ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Request
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Email Us Directly</h3>
                        <p className="text-sm text-muted-foreground">officiallawnconnect@gmail.com</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          We typically respond within 24 hours
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Link to="/refund-policy">
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Refund Policy
                  </Button>
                </Link>
              </div>
            </div>
          </TabsContent>
          )}
        </Tabs>
      </main>
    </>
  );
}
