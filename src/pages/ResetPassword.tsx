import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Scissors, Check, X } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Check for valid session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Invalid or expired reset link');
        navigate('/auth');
      }
    };
    checkSession();
  }, [navigate]);

  const checks = useMemo(() => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  }), [password]);

  const strength = useMemo(() => {
    const passedChecks = Object.values(checks).filter(Boolean).length;
    if (passedChecks === 0) return { level: 0, label: '', color: '' };
    if (passedChecks <= 2) return { level: 1, label: 'Weak', color: 'bg-destructive' };
    if (passedChecks <= 3) return { level: 2, label: 'Fair', color: 'bg-orange-500' };
    if (passedChecks <= 4) return { level: 3, label: 'Good', color: 'bg-yellow-500' };
    return { level: 4, label: 'Strong', color: 'bg-green-500' };
  }, [checks]);

  const isValidPassword = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidPassword) {
      toast.error('Password does not meet requirements');
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully!');
      navigate('/dashboard');
    }
  };

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
            <Scissors className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {password && (
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
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords don't match</p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !isValidPassword || password !== confirmPassword}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
