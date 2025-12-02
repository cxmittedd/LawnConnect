import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { User, Phone, MapPin, Building, Smartphone, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileData {
  full_name: string | null;
  phone_number: string | null;
  address: string | null;
  company_name: string | null;
  lynk_id: string | null;
  user_role: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    phone_number: '',
    address: '',
    company_name: '',
    lynk_id: '',
    user_role: 'customer',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
          full_name: data.full_name || '',
          phone_number: data.phone_number || '',
          address: data.address || '',
          company_name: data.company_name || '',
          lynk_id: data.lynk_id || '',
          user_role: data.user_role || 'customer',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name || null,
          phone_number: profile.phone_number || null,
          address: profile.address || null,
          company_name: profile.company_name || null,
          lynk_id: profile.lynk_id || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
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
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  placeholder="Enter your full name"
                  value={profile.full_name || ''}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                />
              </div>

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

          {/* Lynk Payment Settings - Only for Providers */}
          {isProvider && (
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-primary" />
                      Lynk Payment Settings
                    </CardTitle>
                    <CardDescription>
                      Set up your Lynk ID to receive payments from customers
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Provider</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!profile.lynk_id && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Important:</strong> You need to set up your Lynk ID to receive payments. Customers won't be able to pay you without it.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="lynk_id">Lynk ID / Phone Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lynk_id"
                      placeholder="Your Lynk ID (e.g., 876-555-1234)"
                      className="pl-10"
                      value={profile.lynk_id || ''}
                      onChange={(e) => setProfile({ ...profile, lynk_id: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is the phone number or ID linked to your Lynk account where customers will send payments.
                  </p>
                </div>

                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>
                    <strong>How it works:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                      <li>When your proposal is accepted, the customer sees your Lynk ID</li>
                      <li>Customer pays you directly via the Lynk app</li>
                      <li>Customer enters the transaction reference</li>
                      <li>You confirm receipt in LawnConnect</li>
                      <li>Job starts - you keep 90%, platform fee is 10%</li>
                    </ol>
                  </AlertDescription>
                </Alert>
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
