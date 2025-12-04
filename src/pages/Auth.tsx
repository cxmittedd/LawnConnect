import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Scissors } from 'lucide-react';
import { z } from 'zod';
import { TERMS_VERSION } from './TermsOfService';
import { PRIVACY_VERSION } from './PrivacyPolicy';

const signInSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(1, { message: 'Full name is required' }).max(100),
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string(),
  userRole: z.enum(['customer', 'provider']),
  acceptedTerms: z.literal(true, { 
    errorMap: () => ({ message: 'You must accept the Terms of Service and Privacy Policy' })
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userRole: 'customer' as 'customer' | 'provider',
    acceptedTerms: false,
  });

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signInSchema.safeParse(signInData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signIn(signInData.email, signInData.password);
    setLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Signed in successfully!');
      navigate('/dashboard');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signUpSchema.safeParse(signUpData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error, data } = await signUp(signUpData.email, signUpData.password, signUpData.fullName, signUpData.userRole);
    
    if (error) {
      setLoading(false);
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered');
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Record consent for GDPR/JDPA compliance
    if (data?.user) {
      try {
        await supabase.from('user_consents').insert([
          {
            user_id: data.user.id,
            consent_type: 'terms_of_service',
            consent_version: TERMS_VERSION,
            user_agent: navigator.userAgent,
          },
          {
            user_id: data.user.id,
            consent_type: 'privacy_policy',
            consent_version: PRIVACY_VERSION,
            user_agent: navigator.userAgent,
          }
        ]);
      } catch (consentError) {
        console.error('Failed to record consent:', consentError);
        // Don't block signup if consent recording fails
      }
    }

    setLoading(false);
    toast.success('Account created successfully!');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
            <Scissors className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Welcome to LawnConnect</CardTitle>
            <CardDescription>Connect customers with lawn care professionals</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signUpData.fullName}
                    onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={signUpData.confirmPassword}
                    onChange={(e) =>
                      setSignUpData({ ...signUpData, confirmPassword: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>I am a...</Label>
                  <RadioGroup
                    value={signUpData.userRole}
                    onValueChange={(value: 'customer' | 'provider') =>
                      setSignUpData({ ...signUpData, userRole: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="customer" id="customer" />
                      <Label htmlFor="customer" className="font-normal cursor-pointer">
                        Customer (I need lawn cutting services)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="provider" id="provider" />
                      <Label htmlFor="provider" className="font-normal cursor-pointer">
                        Service Provider (I provide lawn cutting services)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* GDPR/JDPA Compliant Consent Checkbox - NOT pre-checked */}
                <div className="flex items-start space-x-2 pt-2">
                  <Checkbox
                    id="terms"
                    checked={signUpData.acceptedTerms}
                    onCheckedChange={(checked) =>
                      setSignUpData({ ...signUpData, acceptedTerms: checked === true })
                    }
                    className="mt-1"
                  />
                  <Label htmlFor="terms" className="font-normal text-sm leading-relaxed cursor-pointer">
                    I have read and agree to the{' '}
                    <Link 
                      to="/terms" 
                      target="_blank" 
                      className="text-primary underline hover:text-primary/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link 
                      to="/privacy" 
                      target="_blank" 
                      className="text-primary underline hover:text-primary/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Privacy Policy
                    </Link>
                    . I understand how my personal data will be processed in accordance with the 
                    Jamaica Data Protection Act and GDPR.
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
