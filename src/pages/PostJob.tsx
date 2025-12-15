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
import { Upload, X, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { safeToast } from '@/lib/errorHandler';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { JobPaymentForm } from '@/components/JobPaymentForm';
import { AutopaySetupDialog } from '@/components/AutopaySetupDialog';
import { sendInvoice } from '@/lib/invoiceService';
import { useCustomerPreferences } from '@/hooks/useCustomerPreferences';
import { addDays, setDate, isBefore, startOfDay } from 'date-fns';

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
  'Basic Grass Cutting',
  'Basic Grass Cutting (overgrown grass)',
  'Cut + Tree Trimming',
] as const;

const LAWN_SIZES = [
  { value: 'small', label: 'Small (Up to 1/8 acre)', description: 'Typical scheme house yard', minOffer: 7000 },
  { value: 'medium', label: 'Medium (1/8 - 1/4 acre)', description: 'Larger residential yard', minOffer: 8000 },
  { value: 'large', label: 'Large (1/4 - 1/2 acre)', description: 'Spacious property', minOffer: 12000 },
  { value: 'xlarge', label: 'Extra Large (1/2 - 1 acre)', description: 'Estate-sized lawn', minOffer: 18000 },
  { value: 'custom', label: 'Custom (specify below)', description: 'Enter your own estimate', minOffer: 7000 },
] as const;

const LAWN_SIZE_IMAGES = [
  { src: lawnSmall, label: 'Small', size: 'Up to 1/8 acre' },
  { src: lawnMedium, label: 'Medium', size: '1/8 - 1/4 acre' },
  { src: lawnLarge, label: 'Large', size: '1/4 - 1/2 acre' },
  { src: lawnXLarge, label: 'Extra Large', size: '1/2 - 1 acre' },
];

const getMinOffer = (lawnSize: string): number => {
  const size = LAWN_SIZES.find(s => s.value === lawnSize);
  return size?.minOffer || 7000;
};

const createJobSchema = (minOffer: number) => z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(1000).optional(),
  location: z.string().trim().min(1, 'Location is required').max(300),
  parish: z.string().min(1, 'Parish is required'),
  lawn_size: z.string().trim().max(100).optional(),
  preferred_date: z.string().optional(),
  preferred_time: z.string().trim().max(50).optional(),
  additional_requirements: z.string().trim().max(500).optional(),
});

export default function PostJob() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { preferences, savePreferences, saveAutopaySettings, loading: prefsLoading } = useCustomerPreferences();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [lawnSizeSelection, setLawnSizeSelection] = useState('');
  const [customLawnSize, setCustomLawnSize] = useState('');
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [showAutopayDialog, setShowAutopayDialog] = useState(false);
  const [pendingCardInfo, setPendingCardInfo] = useState<{ lastFour: string; name: string } | null>(null);
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

  // Load saved preferences when available
  useEffect(() => {
    if (preferences && !prefsLoading) {
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
    }
  }, [preferences, prefsLoading]);

  const currentMinOffer = getMinOffer(lawnSizeSelection);

const handleLawnSizeChange = (value: string) => {
    setLawnSizeSelection(value);
    const selected = LAWN_SIZES.find(s => s.value === value);
    if (value !== 'custom') {
      setFormData({ ...formData, lawn_size: selected?.label || '' });
      setCustomLawnSize('');
    } else {
      setFormData({ ...formData, lawn_size: customLawnSize });
    }
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
    return currentMinOffer;
  };

const handleProceedToPayment = (e: React.FormEvent) => {
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

    if (!formData.location) {
      toast.error('Please enter a location');
      return;
    }

    setStep('payment');
  };

  const handlePaymentSuccess = async (paymentReference: string, cardInfo: { lastFour: string; name: string }) => {
    setLoading(true);

    try {
      const basePrice = currentMinOffer;
      const paymentAmount = getPaymentAmount();
      const platformFee = Math.round(paymentAmount * 0.30);
      const providerPayout = paymentAmount - platformFee;
      
const { data: job, error: jobError } = await supabase
        .from('job_requests')
        .insert({
          customer_id: user!.id,
          title: formData.title,
          description: formData.description || null,
          location: formData.location,
          parish: formData.parish,
          lawn_size: formData.lawn_size || null,
          preferred_date: formData.preferred_date || null,
          preferred_time: formData.preferred_time || null,
          additional_requirements: formData.additional_requirements || null,
          base_price: basePrice,
          final_price: paymentAmount,
          platform_fee: platformFee,
          provider_payout: providerPayout,
          payment_status: 'paid',
          payment_reference: paymentReference,
          payment_confirmed_at: new Date().toISOString(),
          payment_confirmed_by: user!.id,
          status: 'open',
        })
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
      savePreferences({
        location: formData.location,
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
          jobLocation: formData.location,
          parish: formData.parish,
          lawnSize: formData.lawn_size || null,
          amount: paymentAmount,
          platformFee,
          paymentReference,
        });
      }

      toast.success('Job posted successfully! Payment received.');
      
      // Always offer to set up autopay for this location
      setPendingCardInfo(cardInfo);
      setShowAutopayDialog(true);
    } catch (error) {
      safeToast.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutopaySetup = async (settings: {
    frequency: 'monthly' | 'bimonthly';
    recurring_day: number;
    recurring_day_2?: number;
    location: string;
    location_name: string;
    parish: string;
    lawn_size: string;
    job_type: string;
    additional_requirements: string;
  }) => {
    if (!pendingCardInfo) return;

    const today = startOfDay(new Date());
    let targetDate = setDate(today, settings.recurring_day);
    if (isBefore(targetDate, today) || targetDate.getTime() === today.getTime()) {
      targetDate = setDate(addDays(targetDate, 32), settings.recurring_day);
    }

    let targetDate2: Date | null = null;
    if (settings.frequency === 'bimonthly' && settings.recurring_day_2) {
      targetDate2 = setDate(today, settings.recurring_day_2);
      if (isBefore(targetDate2, today) || targetDate2.getTime() === today.getTime()) {
        targetDate2 = setDate(addDays(targetDate2, 32), settings.recurring_day_2);
      }
    }

    await saveAutopaySettings({
      enabled: true,
      frequency: settings.frequency,
      recurring_day: settings.recurring_day,
      recurring_day_2: settings.recurring_day_2 || null,
      card_last_four: pendingCardInfo.lastFour,
      card_name: pendingCardInfo.name,
      next_scheduled_date: targetDate.toISOString().split('T')[0],
      next_scheduled_date_2: targetDate2 ? targetDate2.toISOString().split('T')[0] : null,
      location: settings.location,
      location_name: settings.location_name,
      parish: settings.parish,
      lawn_size: settings.lawn_size,
      job_type: settings.job_type,
      additional_requirements: settings.additional_requirements,
    });
  };

  const handleAutopayDialogClose = (open: boolean) => {
    setShowAutopayDialog(open);
    if (!open) {
      navigate('/my-jobs');
    }
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

          {step === 'payment' ? (
            <JobPaymentForm
              amount={getPaymentAmount()}
              jobTitle={formData.title}
              onPaymentSuccess={handlePaymentSuccess}
              onCancel={() => setStep('details')}
              loading={loading}
            />
          ) : (
          <form onSubmit={handleProceedToPayment}>
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
                <CardDescription>Minimum price: J${currentMinOffer.toLocaleString()}. Pay upfront to post your job.</CardDescription>
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
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lawn_size">Lawn Size</Label>
                    <Select
                      value={lawnSizeSelection}
                      onValueChange={handleLawnSizeChange}
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
                    {lawnSizeSelection === 'custom' && (
                      <Input
                        id="custom_lawn_size"
                        placeholder="Enter your lawn size estimate"
                        value={customLawnSize}
                        onChange={(e) => handleCustomLawnSizeChange(e.target.value)}
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preferred_date">Preferred Date</Label>
                    <Input
                      id="preferred_date"
                      type="date"
                      value={formData.preferred_date}
                      onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                    />
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

                <Button type="submit" className="w-full" disabled={loading}>
                  <span>Continue to Payment</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </form>
          )}
        </div>
      </main>

      {/* Autopay Setup Dialog */}
      {pendingCardInfo && (
        <AutopaySetupDialog
          open={showAutopayDialog}
          onOpenChange={handleAutopayDialogClose}
          cardLastFour={pendingCardInfo.lastFour}
          cardName={pendingCardInfo.name}
          jobDetails={{
            location: formData.location,
            parish: formData.parish,
            lawn_size: lawnSizeSelection,
            job_type: formData.title,
            additional_requirements: formData.additional_requirements,
          }}
          onConfirm={handleAutopaySetup}
        />
      )}
    </>
  );
}
