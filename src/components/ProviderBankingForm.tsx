import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Landmark, Clock, CheckCircle, XCircle, AlertTriangle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useProviderBanking } from '@/hooks/useProviderBanking';
import { useProviderVerification } from '@/hooks/useProviderVerification';

const bankingFormSchema = z.object({
  full_legal_name: z.string().min(2, 'Full legal name is required').max(100, 'Name is too long'),
  bank_name: z.enum(['scotiabank_jamaica', 'ncb_jamaica'], {
    required_error: 'Please select a bank',
  }),
  branch_name: z.string().min(2, 'Branch name is required').max(100, 'Branch name is too long'),
  branch_number: z.string().max(20, 'Branch number is too long').optional(),
  account_number: z.string().min(5, 'Account number is required').max(30, 'Account number is too long'),
  account_type: z.enum(['savings', 'chequing'], {
    required_error: 'Please select an account type',
  }),
  trn: z.string().min(9, 'TRN must be 9 digits').max(12, 'TRN is too long').regex(/^\d{9}$/, 'TRN must be exactly 9 digits'),
});

type BankingFormValues = z.infer<typeof bankingFormSchema>;

interface ProviderBankingFormProps {
  onComplete?: () => void;
}

export function ProviderBankingForm({ onComplete }: ProviderBankingFormProps) {
  const { user } = useAuth();
  const { bankingDetails, bankingStatus, isPending, isVerified, isRejected, loading, refresh } = useProviderBanking();
  const { isVerified: isIdVerified, isPending: isIdPending, loading: idLoading } = useProviderVerification();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<BankingFormValues>({
    resolver: zodResolver(bankingFormSchema),
    defaultValues: {
      full_legal_name: '',
      bank_name: undefined,
      branch_name: '',
      branch_number: '',
      account_number: '',
      account_type: undefined,
      trn: '',
    },
  });

  // When rejected, don't pre-populate sensitive fields - user must re-enter
  // This is a security measure to prevent sensitive data from being transmitted to client
  useEffect(() => {
    if (bankingDetails && isRejected) {
      form.reset({
        full_legal_name: bankingDetails.full_legal_name,
        bank_name: bankingDetails.bank_name,
        branch_name: bankingDetails.branch_name,
        branch_number: bankingDetails.branch_number || '',
        // Never pre-populate account_number and trn - user must re-enter for security
        account_number: '',
        account_type: bankingDetails.account_type,
        trn: '',
      });
    }
  }, [bankingDetails, isRejected, form]);

  const onSubmit = async (values: BankingFormValues) => {
    if (!user) return;

    setSubmitting(true);

    try {
      if (bankingDetails) {
        // Update existing record
        const { error } = await supabase
          .from('provider_banking_details')
          .update({
            full_legal_name: values.full_legal_name,
            bank_name: values.bank_name,
            branch_name: values.branch_name,
            branch_number: values.branch_number || null,
            account_number: values.account_number,
            account_type: values.account_type,
            trn: values.trn,
            status: 'pending',
            admin_notes: null,
          })
          .eq('provider_id', user.id);

        if (error) throw error;
        toast.success('Banking details updated and submitted for review');
      } else {
        // Insert new record
        const { error } = await supabase
          .from('provider_banking_details')
          .insert({
            provider_id: user.id,
            full_legal_name: values.full_legal_name,
            bank_name: values.bank_name,
            branch_name: values.branch_name,
            branch_number: values.branch_number || null,
            account_number: values.account_number,
            account_type: values.account_type,
            trn: values.trn,
          });

        if (error) throw error;
        toast.success('Banking details submitted for review');
      }

      refresh();
      onComplete?.();
    } catch (error: any) {
      console.error('Error submitting banking details:', error);
      toast.error(error.message || 'Failed to submit banking details');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || idLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </CardContent>
      </Card>
    );
  }

  // Block access if ID verification is not approved
  if (!isIdVerified) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-muted-foreground">Payout Information</CardTitle>
          </div>
          <CardDescription>Enter your banking details to receive payouts</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-warning/10 border-warning">
            <Shield className="h-4 w-4 text-warning" />
            <AlertDescription>
              {isIdPending ? (
                <span>
                  <strong>ID verification pending:</strong> Your ID is currently under review. 
                  Once approved, you'll be able to submit your banking details.
                </span>
              ) : (
                <span>
                  <strong>ID verification required:</strong> You must complete and have your ID verification 
                  approved before submitting banking details. Please complete the ID Verification step above first.
                </span>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show status if verified
  if (isVerified) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <CardTitle>Payout Information</CardTitle>
          </div>
          <CardDescription>Your banking details for receiving payouts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-success/10 border-success">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              Your banking information has been verified. You can now accept jobs!
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Legal Name</Label>
                <p className="font-medium">{bankingDetails?.full_legal_name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Bank</Label>
                <p className="font-medium">
                  {bankingDetails?.bank_name === 'scotiabank_jamaica' ? 'Scotiabank Jamaica' : 'NCB Jamaica'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Account Type</Label>
                <p className="font-medium capitalize">{bankingDetails?.account_type}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Account Number</Label>
                <p className="font-medium">{bankingDetails?.account_number_masked}</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            To update your banking information, please contact support.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show pending status
  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <CardTitle>Payout Information</CardTitle>
            <Badge className="bg-warning text-warning-foreground gap-1">
              <Clock className="h-3 w-3" /> Pending Review
            </Badge>
          </div>
          <CardDescription>Your banking details are under review</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Your banking information is currently being reviewed. This typically takes 1-2 business days.
              You'll be able to accept jobs once your banking details are verified.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Legal Name</Label>
                <p className="font-medium">{bankingDetails?.full_legal_name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Bank</Label>
                <p className="font-medium">
                  {bankingDetails?.bank_name === 'scotiabank_jamaica' ? 'Scotiabank Jamaica' : 'NCB Jamaica'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Branch</Label>
                <p className="font-medium">{bankingDetails?.branch_name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">TRN</Label>
                <p className="font-medium">{bankingDetails?.trn_masked}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show rejection notice or form
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <CardTitle>Payout Information</CardTitle>
          {isRejected && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" /> Rejected
            </Badge>
          )}
        </div>
        <CardDescription>
          {isRejected
            ? 'Please update your banking details and resubmit'
            : 'Enter your banking details to receive payouts for completed jobs'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isRejected && bankingDetails?.admin_notes && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Rejection reason:</strong> {bankingDetails.admin_notes}
            </AlertDescription>
          </Alert>
        )}

        {!bankingDetails && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You must submit and have your banking details verified before you can accept jobs on the platform.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_legal_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Legal Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full legal name" {...field} />
                  </FormControl>
                  <FormDescription>Must match the name on your bank account</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bank_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your bank" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="scotiabank_jamaica">Scotiabank Jamaica</SelectItem>
                      <SelectItem value="ncb_jamaica">NCB Jamaica</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="branch_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Half Way Tree" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="branch_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Number / Transit</FormLabel>
                    <FormControl>
                      <Input placeholder="If applicable" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="account_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your account number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="account_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="chequing">Chequing</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="trn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TRN (Tax Registration Number) *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your 9-digit TRN" maxLength={9} {...field} />
                  </FormControl>
                  <FormDescription>Your 9-digit Jamaica Tax Registration Number</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Submitting...' : isRejected ? 'Resubmit for Review' : 'Submit for Review'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
