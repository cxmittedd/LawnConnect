import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, ArrowRight, Wand2, CalendarIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { safeToast } from '@/lib/errorHandler';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { JobPaymentForm } from '@/components/JobPaymentForm';
import { sendInvoice } from '@/lib/invoiceService';
import { useCustomerPreferences } from '@/hooks/useCustomerPreferences';
import { format, isBefore, startOfDay } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import lawnSmall from '@/assets/lawn-size-small.jpg';
import lawnMedium from '@/assets/lawn-size-medium.jpg';
import lawnLarge from '@/assets/lawn-size-large.jpg';
import lawnXLarge from '@/assets/lawn-size-xlarge.jpg';

const JAMAICA_PARISHES = [
  'Kingston',
  'St. Andrew',
  'St. Thomas',
  'Portland',
  'St. Mary',
  'St. Ann',
  'Trelawny',
  'St. James',
  'Hanover',
  'Westmoreland',
  'St. Elizabeth',
  'Manchester',
  'Clarendon',
  'St. Catherine',
] as const;

const JOB_TYPES = [
  { value: 'Regular Lawn Cut', label: 'Regular Lawn Cut', extraCost: 0 },
  { value: 'Regular Lawn Cut + Cleanup', label: 'Regular Lawn Cut + Cleanup (+$500)', extraCost: 500 },
  { value: 'Lawn Cut (Overgrown Grass)', label: 'Lawn Cut (Overgrown Grass) (+$1,000)', extraCost: 1000 },
  { value: 'Lawn Cut (Overgrown Grass) + Cleanup', label: 'Lawn Cut (Overgrown Grass) + Cleanup (+$1,500)', extraCost: 1500 },
] as const;

const getJobTypeExtraCost = (jobType: string): number => {
  const type = JOB_TYPES.find(t => t.value === jobType);
  return type?.extraCost || 0;
};

const LAWN_SIZES = [
  { value: 'small', label: 'Small (Up to 1/8 acre)', description: 'Typical scheme house yard', minOffer: 5000 },
  { value: 'medium', label: 'Medium (1/8 - 1/4 acre)', description: 'Larger residential yard', minOffer: 13000 },
  { value: 'large', label: 'Large (1/4 - 1/2 acre)', description: 'Spacious property', minOffer: 18500 },
  { value: 'xlarge', label: 'Extra Large (1/2 - 1 acre)', description: 'Estate-sized lawn', minOffer: 35000 },
] as const;

const LAWN_SIZE_IMAGES = [
  { src: lawnSmall, label: 'Small', size: 'Up to 1/8 acre' },
  { src: lawnMedium, label: 'Medium', size: '1/8 - 1/4 acre' },
  { src: lawnLarge, label: 'Large', size: '1/4 - 1/2 acre' },
  { src: lawnXLarge, label: 'Extra Large', size: '1/2 - 1 acre' },
];

const getMinOffer = (lawnSize: string): number => {
  const size = LAWN_SIZES.find(s => s.value === lawnSize);
  return size?.minOffer || 5000;
};

const createJobSchema = (minOffer: number) => z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(1000).optional(),
  location: z.string().trim().max(300).optional(),
  parish: z.string().min(1, 'Parish is required'),
  lawn_size: z.string().trim().min(1, 'Lawn size is required').max(100),
  preferred_date: z.string().min(1, 'Preferred date is required'),
  preferred_time: z.string().trim().max(50).optional(),
  additional_requirements: z.string().trim().max(500).optional(),
});

export default function PostJob() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { preferences, savePreferences, loading: prefsLoading } = useCustomerPreferences();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [lawnSizeSelection, setLawnSizeSelection] = useState('');
  const [customLawnSize, setCustomLawnSize] = useState('');
  const [step, setStep] = useState<'details' | 'payment' | 'failed'>('details');
  const [showAutofillPreview, setShowAutofillPreview] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [failedJobId, setFailedJobId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [community, setCommunity] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [phase, setPhase] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    parish: '',
    lawn_size: '',
    preferred_date: '',
    preferred_time: '',
    additional_requirements: '',
  });

  const parseYmdToLocalDate = (ymd: string) => {
    const [year, month, day] = ymd.split('-').map((v) => Number(v));
    return new Date(year, month - 1, day);
  };

  // Check for cancelled payment on mount
  // Check for payment return on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentComplete = urlParams.get('payment_complete');
    const paymentCancelled = urlParams.get('payment_cancelled');
    const orderId = urlParams.get('order_id');
    
    if (paymentCancelled === 'true' && orderId) {
      handlePaymentCancelled(orderId);
      window.history.replaceState({}, '', '/post-job');
    } else if (paymentComplete === 'true' && orderId) {
      setPendingJobId(orderId);
      setStep('payment'); // This will trigger JobPaymentForm to check status
      window.history.replaceState({}, '', '/post-job');
    }
  }, []);

  const handlePaymentCancelled = async (jobId: string) => {
    toast.error('Payment was cancelled');
    setStep('failed');
    setFailedJobId(jobId);
    
    // Delete the cancelled job from the database
    try {
      await supabase
        .from('job_requests')
        .delete()
        .eq('id', jobId)
        .eq('payment_status', 'pending');
    } catch (error) {
      console.error('Error cleaning up cancelled job:', error);
    }
  };

  // Function to apply autofill from saved preferences
  const applyAutofill = () => {
    if (preferences) {
      const lawnSizeValue = LAWN_SIZES.find(s => s.label === preferences.lawn_size)?.value || '';
      setLawnSizeSelection(lawnSizeValue);
      setFormData(prev => ({
        ...prev,
        location: preferences.location || prev.location,
        parish: preferences.parish || prev.parish,
        lawn_size: preferences.lawn_size || prev.lawn_size,
        title: preferences.job_type || prev.title,
        additional_requirements: preferences.additional_requirements || prev.additional_requirements,
      }));
      setShowAutofillPreview(false);
      toast.success('Previous job details loaded');
    }
  };

  const hasPreferences = preferences && (preferences.location || preferences.parish || preferences.lawn_size || preferences.job_type);

  // Function to clear all form fields
  const clearForm = () => {
    setLawnSizeSelection('');
    setCustomLawnSize('');
    setCommunity('');
    setLotNumber('');
    setPhase('');
    setFormData({
      title: '',
      description: '',
      location: '',
      parish: '',
      lawn_size: '',
      preferred_date: '',
      preferred_time: '',
      additional_requirements: '',
    });
    setPhotos([]);
    toast.success('Form cleared');
  };

  // Get preview data for autofill dialog
  const getPreviewItems = () => {
    if (!preferences) return [];
    const items: { label: string; value: string }[] = [];
    if (preferences.job_type) items.push({ label: 'Job Type', value: preferences.job_type });
    if (preferences.parish) items.push({ label: 'Parish', value: preferences.parish });
    if (preferences.location) items.push({ label: 'Location', value: preferences.location });
    if (preferences.lawn_size) items.push({ label: 'Lawn Size', value: preferences.lawn_size });
    if (preferences.additional_requirements) items.push({ label: 'Additional Requirements', value: preferences.additional_requirements });
    return items;
  };

  const currentMinOffer = getMinOffer(lawnSizeSelection);

const handleLawnSizeChange = (value: string) => {
    setLawnSizeSelection(value);
    const selected = LAWN_SIZES.find(s => s.value === value);
    setFormData({ ...formData, lawn_size: selected?.label || '' });
  };

  const handleCustomLawnSizeChange = (value: string) => {
    setCustomLawnSize(value);
    setFormData({ ...formData, lawn_size: value });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      if (photos.length + newPhotos.length > 5) {
        toast.error('Maximum 5 photos allowed');
        return;
      }
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const getPaymentAmount = () => {
    const jobTypeExtra = getJobTypeExtraCost(formData.title);
    return currentMinOffer + jobTypeExtra;
  };

const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    const jobSchema = createJobSchema(currentMinOffer);
    const result = jobSchema.safeParse(formData);

    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    if (!formData.title) {
      toast.error('Please select a job type');
      return;
    }

    if (!formData.parish) {
      toast.error('Please select a parish');
      return;
    }

    if (community === 'coral_spring') {
      if (!lotNumber.trim()) {
        toast.error('Please enter a lot number');
        return;
      }
      if (!phase) {
        toast.error('Please select a phase');
        return;
      }
    } else if (!formData.location) {
      toast.error('Please enter a location');
      return;
    }

    if (!lawnSizeSelection) {
      toast.error('Please select a lawn size');
      return;
    }

    if (!formData.preferred_date) {
      toast.error('Please select a preferred date');
      return;
    }

    // Build location string for community
    const jobLocation = community === 'coral_spring'
      ? `Coral Spring, ${phase}, Lot ${lotNumber.trim()}`
      : formData.location;

    // Create a pending job first so we have a job ID for payment
    setLoading(true);
    try {
      const basePrice = currentMinOffer;
      const paymentAmount = getPaymentAmount();
      const platformFee = 0;
      const providerPayout = paymentAmount;
      
      const { data: job, error: jobError } = await supabase
        .from('job_requests')
        .insert({
          customer_id: user!.id,
          title: formData.title,
          description: formData.description || null,
          location: jobLocation,
          parish: formData.parish,
          community: community && community !== 'none' ? community : null,
          lawn_size: formData.lawn_size || null,
          preferred_date: formData.preferred_date || null,
          preferred_time: formData.preferred_time || null,
          additional_requirements: formData.additional_requirements || null,
          base_price: basePrice,
          final_price: paymentAmount,
          platform_fee: platformFee,
          provider_payout: providerPayout,
          payment_status: 'pending',
          status: 'open',
        })
        .select()
        .single();

      if (jobError) throw jobError;

      setPendingJobId(job.id);
      setStep('payment');
    } catch (error) {
      safeToast.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentReference: string, cardInfo: { lastFour: string; name: string }) => {
    if (!pendingJobId) {
      safeToast.error('No pending job found');
      return;
    }

    setLoading(true);

    try {
      const paymentAmount = getPaymentAmount();
      const platformFee = 0;
      
      // Update the pending job with payment info
      const { data: job, error: jobError } = await supabase
        .from('job_requests')
        .update({
          payment_status: 'paid',
          payment_reference: paymentReference,
          payment_confirmed_at: new Date().toISOString(),
          payment_confirmed_by: user!.id,
          status: 'open',
        })
        .eq('id', pendingJobId)
        .select()
        .single();

      if (jobError) throw jobError;

      // Upload photos if any
      if (photos.length > 0 && job) {
        for (const photo of photos) {
          const fileExt = photo.name.split('.').pop();
          const fileName = `${user!.id}/${job.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('job-photos')
            .upload(fileName, photo);

          if (uploadError) throw uploadError;

          await supabase.from('job_photos').insert({
            job_id: job.id,
            photo_url: fileName,
          });
        }
      }

      // Save preferences for next time
      const savedLocation = community === 'coral_spring'
        ? `Coral Spring, ${phase}, Lot ${lotNumber.trim()}`
        : formData.location;
      savePreferences({
        location: savedLocation,
        parish: formData.parish,
        lawn_size: formData.lawn_size,
        job_type: formData.title,
        additional_requirements: formData.additional_requirements,
      });

      // Send invoice to customer
      if (job && user?.email) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();
        
        const customerName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Customer'
          : 'Customer';

        sendInvoice({
          jobId: job.id,
          customerId: user.id,
          customerEmail: user.email,
          customerName,
          jobTitle: formData.title,
          jobLocation: savedLocation,
          parish: formData.parish,
          lawnSize: formData.lawn_size || null,
          amount: paymentAmount,
          platformFee,
          paymentReference,
        });
      }

      toast.success('Job posted successfully! Payment received.');
      navigate('/my-jobs');
    } catch (error) {
      safeToast.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentFailed = async (jobId: string) => {
    setFailedJobId(jobId);
    setStep('failed');
    
    // Delete the failed job from the database
    try {
      await supabase
        .from('job_requests')
        .delete()
        .eq('id', jobId)
        .eq('payment_status', 'failed');
    } catch (error) {
      console.error('Error cleaning up failed job:', error);
    }
  };

  const handleRetryPayment = () => {
    setFailedJobId(null);
    setPendingJobId(null);
    setStep('details');
  };

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Post a Job Request</h1>
            <p className="text-muted-foreground">Tell us about your lawn cutting needs</p>
          </div>

          {step === 'failed' ? (
            <Card className="border-destructive">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <X className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle className="text-destructive">Payment Failed</CardTitle>
                <CardDescription>
                  Your payment could not be processed. No charges have been made to your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">What happened?</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Your card may have been declined</li>
                    <li>There may have been insufficient funds</li>
                    <li>The transaction was cancelled</li>
                  </ul>
                </div>
                <div className="flex flex-col gap-3">
                  <Button onClick={handleRetryPayment} className="w-full">
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/my-jobs')} className="w-full">
                    Go to My Jobs
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : step === 'payment' && pendingJobId ? (
            <JobPaymentForm
              amount={getPaymentAmount()}
              jobTitle={formData.title}
              lawnSize={formData.lawn_size}
              lawnSizeCost={currentMinOffer}
              jobTypeCost={getJobTypeExtraCost(formData.title)}
              jobId={pendingJobId}
              customerEmail={user?.email || ''}
              customerName={user?.user_metadata?.first_name || ''}
              onPaymentSuccess={(paymentReference, cardInfo) => handlePaymentSuccess(paymentReference, cardInfo)}
              onPaymentFailed={handlePaymentFailed}
              onCancel={() => setStep('details')}
              loading={loading}
            />
          ) : step === 'payment' ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Loading payment...</p>
            </div>
          ) : (
          <form onSubmit={handleProceedToPayment}>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Job Details</CardTitle>
                    <CardDescription>Pay upfront to post your job.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearForm}
                      className="gap-2 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                    {hasPreferences && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAutofillPreview(true)}
                        className="gap-2"
                      >
                        <Wand2 className="h-4 w-4" />
                        Autofill
                      </Button>
                    )}
                  </div>
                  
                  {/* Autofill Preview Dialog */}
                  <Dialog open={showAutofillPreview} onOpenChange={setShowAutofillPreview}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Autofill from Previous Job</DialogTitle>
                        <DialogDescription>
                          The following details will be filled in from your last job:
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-4">
                        {getPreviewItems().map((item, index) => (
                          <div key={index} className="flex flex-col gap-1 rounded-lg border p-3">
                            <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                            <span className="text-sm">{item.value}</span>
                          </div>
                        ))}
                        {getPreviewItems().length === 0 && (
                          <p className="text-sm text-muted-foreground">No saved preferences found.</p>
                        )}
                      </div>
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowAutofillPreview(false)}>
                          Cancel
                        </Button>
                        <Button onClick={applyAutofill} disabled={getPreviewItems().length === 0}>
                          Apply
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Type *</Label>
                  <Select
                    value={formData.title}
                    onValueChange={(value) => setFormData({ ...formData, title: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Community</Label>
                  <Select
                    value={community}
                    onValueChange={(value) => {
                      setCommunity(value);
                      if (value === 'coral_spring') {
                        setFormData(prev => ({ ...prev, parish: 'Trelawny' }));
                      } else {
                        setLotNumber('');
                        setPhase('');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select community (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="coral_spring">Coral Spring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parish">Parish *</Label>
                    <Select
                      value={formData.parish}
                      onValueChange={(value) => setFormData({ ...formData, parish: value })}
                      required
                      disabled={community === 'coral_spring'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parish" />
                      </SelectTrigger>
                      <SelectContent>
                        {JAMAICA_PARISHES.map((parish) => (
                          <SelectItem key={parish} value={parish}>
                            {parish}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {community === 'coral_spring' ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="lot_number">Lot Number *</Label>
                        <Input
                          id="lot_number"
                          type="number"
                          placeholder="Enter lot number"
                          value={lotNumber}
                          onChange={(e) => setLotNumber(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <Input
                        id="location"
                        placeholder="Street address or neighborhood"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        required
                      />
                    </div>
                  )}
                </div>

                {community === 'coral_spring' && (
                  <div className="space-y-2">
                    <Label>Phase *</Label>
                    <Select
                      value={phase}
                      onValueChange={setPhase}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select phase" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Phase 1">Phase 1</SelectItem>
                        <SelectItem value="Phase 2">Phase 2</SelectItem>
                        <SelectItem value="Phase 3">Phase 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lawn_size">Lawn Size *</Label>
                    <Select
                      value={lawnSizeSelection}
                      onValueChange={handleLawnSizeChange}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select lawn size" />
                      </SelectTrigger>
                      <SelectContent>
                        {LAWN_SIZES.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            <div className="flex flex-col">
                              <span>{size.label}</span>
                              <span className="text-xs text-muted-foreground">{size.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preferred_date">Preferred Date *</Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.preferred_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.preferred_date ? format(parseYmdToLocalDate(formData.preferred_date), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.preferred_date ? parseYmdToLocalDate(formData.preferred_date) : undefined}
                          onSelect={(date) => {
                            setFormData({ ...formData, preferred_date: date ? format(date, 'yyyy-MM-dd') : '' });
                            setCalendarOpen(false);
                          }}
                          disabled={(date) => isBefore(date, startOfDay(new Date()))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Note: This is your preferred date, not a guarantee. Providers have until the day after this date to complete the job.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferred_time">Preferred Time</Label>
                    <Input
                      id="preferred_time"
                      placeholder="e.g., Morning, Afternoon"
                      value={formData.preferred_time}
                      onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Additional details about the job..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional_requirements">Additional Requirements</Label>
                  <Textarea
                    id="additional_requirements"
                    placeholder="Any extra work needed? (hedge trimming, debris removal, etc.)"
                    value={formData.additional_requirements}
                    onChange={(e) => setFormData({ ...formData, additional_requirements: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Photos (Optional, Max 5)</Label>
                    <div className="flex flex-wrap gap-4">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Preview ${index + 1}`}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {photos.length < 5 && (
                        <label className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handlePhotoChange}
                          />
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload photos of your lawn to help providers understand the job
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Lawn Size Reference Guide</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {LAWN_SIZE_IMAGES.map((img) => (
                        <div key={img.label} className="text-center space-y-1">
                          <img
                            src={img.src}
                            alt={`${img.label} lawn example`}
                            className="w-full aspect-square object-cover rounded-lg border border-border"
                          />
                          <p className="text-xs font-medium text-foreground">{img.label}</p>
                          <p className="text-xs text-muted-foreground">{img.size}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-muted/50">
                  <Checkbox
                    id="terms-agreement"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  />
                  <label htmlFor="terms-agreement" className="text-sm leading-relaxed cursor-pointer">
                    I agree to the{' '}
                    <Link to="/terms" className="text-primary hover:underline font-medium">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/refund-policy" className="text-primary hover:underline font-medium">
                      Refund Policy
                    </Link>
                  </label>
                </div>

                <Button type="submit" className="w-full" disabled={loading || !agreedToTerms}>
                  <span>Continue to Payment</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </form>
          )}
        </div>
      </main>

    </>
  );
}
