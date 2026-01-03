import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { z } from 'zod';
import { useMemo } from 'react';
import { TERMS_VERSION } from './TermsOfService';
import { PRIVACY_VERSION } from './PrivacyPolicy';
import lawnConnectLogo from '@/assets/lawnconnect-logo.png';

const signInSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const signUpSchema = z.object({
  firstName: z.string().trim().min(1, { message: 'First name is required' }).max(50),
  lastName: z.string().trim().min(1, { message: 'Last name is required' }).max(50),
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' })
    .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' }),
  confirmPassword: z.string(),
  userRole: z.enum(['customer', 'provider']),
  acceptedTerms: z.literal(true, { 
    errorMap: () => ({ message: 'You must accept the Terms of Service and Privacy Policy' })
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Password strength indicator component
function PasswordStrengthField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const checks = useMemo(() => ({
    minLength: value.length >= 8,
    hasUppercase: /[A-Z]/.test(value),
    hasLowercase: /[a-z]/.test(value),
    hasNumber: /[0-9]/.test(value),
    hasSpecial: /[^A-Za-z0-9]/.test(value),
  }), [value]);

  const strength = useMemo(() => {
    const passedChecks = Object.values(checks).filter(Boolean).length;
    if (passedChecks === 0) return { level: 0, label: '', color: '' };
    if (passedChecks <= 2) return { level: 1, label: 'Weak', color: 'bg-destructive' };
    if (passedChecks <= 3) return { level: 2, label: 'Fair', color: 'bg-orange-500' };
    if (passedChecks <= 4) return { level: 3, label: 'Good', color: 'bg-yellow-500' };
    return { level: 4, label: 'Strong', color: 'bg-green-500' };
  }, [checks]);

  const CheckItem = ({ passed, label }: { passed: boolean; label: string }) => (
    <div className="flex items-center gap-1.5 text-xs">
      {passed ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <X className="h-3 w-3 text-muted-foreground/50" />
      )}
      <span className={passed ? 'text-green-600' : 'text-muted-foreground'}>{label}</span>
    </div>
  );

  return (
    <div className="space-y-2">
      <Label htmlFor="signup-password">Password</Label>
      <Input
        id="signup-password"
        type="password"
        placeholder="••••••••"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
      {value && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= strength.level ? strength.color : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <span className={`text-xs font-medium ${
              strength.level <= 1 ? 'text-destructive' : 
              strength.level === 2 ? 'text-orange-500' : 
              strength.level === 3 ? 'text-yellow-600' : 'text-green-500'
            }`}>
              {strength.label}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <CheckItem passed={checks.minLength} label="8+ characters" />
            <CheckItem passed={checks.hasUppercase} label="Uppercase" />
            <CheckItem passed={checks.hasLowercase} label="Lowercase" />
            <CheckItem passed={checks.hasNumber} label="Number" />
            <CheckItem passed={checks.hasSpecial} label="Special char" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({
    firstName: '',
    lastName: '',
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
    const fullName = `${signUpData.firstName} ${signUpData.lastName}`.trim();
    const { error, data } = await signUp(signUpData.email, signUpData.password, fullName, signUpData.userRole);
    
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

      // Send welcome email (fire-and-forget)
      supabase.functions.invoke('send-welcome-email', {
        body: {
          email: signUpData.email,
          firstName: signUpData.firstName,
          userRole: signUpData.userRole,
        }
      }).catch(err => console.error('Failed to send welcome email:', err));
    }

    setLoading(false);
    toast.success('Account created successfully!');
    navigate('/dashboard');
  };

  return (
    <>
    <div className="min-h-screen flex items-center justify-center bg-page-pattern p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <img src={lawnConnectLogo} alt="LawnConnect" className="mx-auto h-40 w-40 object-contain" />
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
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="w-full text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-first-name">First Name</Label>
                    <Input
                      id="signup-first-name"
                      type="text"
                      placeholder="John"
                      value={signUpData.firstName}
                      onChange={(e) => setSignUpData({ ...signUpData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-last-name">Last Name</Label>
                    <Input
                      id="signup-last-name"
                      type="text"
                      placeholder="Doe"
                      value={signUpData.lastName}
                      onChange={(e) => setSignUpData({ ...signUpData, lastName: e.target.value })}
                      required
                    />
                  </div>
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
                <PasswordStrengthField 
                  value={signUpData.password}
                  onChange={(value) => setSignUpData({ ...signUpData, password: value })}
                />
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
                      className="text-primary underline hover:text-primary/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link 
                      to="/privacy" 
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

    {/* Forgot Password Dialog */}
    <ForgotPasswordDialog 
      open={showForgotPassword} 
      onOpenChange={setShowForgotPassword}
      initialEmail={signInData.email}
    />
    </>
  );
}

function ForgotPasswordDialog({ 
  open, 
  onOpenChange,
  initialEmail 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
}) {
  const [email, setEmail] = useState(initialEmail || '');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (open && initialEmail) {
      setEmail(initialEmail);
    }
    if (!open) {
      setSent(false);
    }
  }, [open, initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    
    // First, generate the reset link using Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // Send custom branded email via our edge function
    try {
      const resetLink = `${window.location.origin}/reset-password`;
      const { error: emailError } = await supabase.functions.invoke('send-password-reset', {
        body: { email, resetLink }
      });

      if (emailError) {
        console.error('Custom email failed, using default:', emailError);
      }
    } catch (emailErr) {
      console.error('Custom email error:', emailErr);
    }

    setLoading(false);
    setSent(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{sent ? 'Check your email' : 'Reset password'}</DialogTitle>
          <DialogDescription>
            {sent 
              ? "We've sent you a password reset link. Please check your inbox and spam folder."
              : "Enter your email address and we'll send you a link to reset your password."
            }
          </DialogDescription>
        </DialogHeader>
        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
            </div>
          </form>
        ) : (
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Back to sign in
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
