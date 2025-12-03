import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

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

const jobSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(1000).optional(),
  location: z.string().trim().min(1, 'Location is required').max(300),
  parish: z.string().min(1, 'Parish is required'),
  lawn_size: z.string().trim().max(100).optional(),
  preferred_date: z.string().optional(),
  preferred_time: z.string().trim().max(50).optional(),
  additional_requirements: z.string().trim().max(500).optional(),
  customer_offer: z.number().min(7000, 'Minimum offer is J$7000').optional(),
});

export default function PostJob() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    parish: '',
    lawn_size: '',
    preferred_date: '',
    preferred_time: '',
    additional_requirements: '',
    customer_offer: '',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = jobSchema.safeParse({
      ...formData,
      customer_offer: formData.customer_offer ? parseFloat(formData.customer_offer) : undefined,
    });

    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // Create job request
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
          customer_offer: formData.customer_offer ? parseFloat(formData.customer_offer) : null,
          base_price: 7000,
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

          const { data: { publicUrl } } = supabase.storage
            .from('job-photos')
            .getPublicUrl(fileName);

          await supabase.from('job_photos').insert({
            job_id: job.id,
            photo_url: publicUrl,
          });
        }
      }

      toast.success('Job posted successfully!');
      navigate('/my-jobs');
    } catch (error: any) {
      toast.error(error.message || 'Failed to post job');
    } finally {
      setLoading(false);
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

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
                <CardDescription>Minimum price: J$7,000. Add more for larger properties.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Regular Lawn Cutting - 2 Bedroom House"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
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
                    <Input
                      id="lawn_size"
                      placeholder="e.g., Small, Medium, Large"
                      value={formData.lawn_size}
                      onChange={(e) => setFormData({ ...formData, lawn_size: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_offer">Your Offer (J$)</Label>
                    <Input
                      id="customer_offer"
                      type="number"
                      min="7000"
                      step="100"
                      placeholder="7000"
                      value={formData.customer_offer}
                      onChange={(e) => setFormData({ ...formData, customer_offer: e.target.value })}
                    />
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

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Posting Job...' : 'Post Job Request'}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      </main>
    </>
  );
}
