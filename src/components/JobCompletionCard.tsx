import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Clock, Flag, PartyPopper, Star, Camera, Upload, X, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sendNotification } from '@/lib/notifications';

interface JobCompletionCardProps {
  jobId: string;
  jobTitle: string;
  customerId: string;
  status: string;
  providerCompletedAt: string | null;
  completedAt: string | null;
  isCustomer: boolean;
  isProvider: boolean;
  providerName: string;
  onStatusUpdate: () => void;
}

interface CompletionPhoto {
  id: string;
  photo_url: string;
  created_at: string;
}

export function JobCompletionCard({
  jobId,
  jobTitle,
  customerId,
  status,
  providerCompletedAt,
  completedAt,
  isCustomer,
  isProvider,
  providerName,
  onStatusUpdate,
}: JobCompletionCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [providerCompleteDialog, setProviderCompleteDialog] = useState(false);
  const [customerConfirmDialog, setCustomerConfirmDialog] = useState(false);
  const [completionPhotos, setCompletionPhotos] = useState<CompletionPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCompletionPhotos();
  }, [jobId]);

  useEffect(() => {
    // Create preview URLs for selected files
    const urls = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    
    // Cleanup
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [selectedFiles]);

  const loadCompletionPhotos = async () => {
    const { data, error } = await supabase
      .from('job_completion_photos')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Get signed URLs for each photo
      const photosWithUrls = await Promise.all(
        data.map(async (photo) => {
          const { data: signedUrlData } = await supabase.storage
            .from('completion-photos')
            .createSignedUrl(photo.photo_url, 3600); // 1 hour expiry
          return {
            ...photo,
            photo_url: signedUrlData?.signedUrl || photo.photo_url
          };
        })
      );
      setCompletionPhotos(photosWithUrls);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 5) {
      toast.error('Maximum 5 photos allowed');
      return;
    }
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<boolean> => {
    if (selectedFiles.length === 0) {
      toast.error('Please upload at least one photo of the completed work');
      return false;
    }

    setUploadingPhotos(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${jobId}/${crypto.randomUUID()}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('completion-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Save reference to database
        const { error: dbError } = await supabase
          .from('job_completion_photos')
          .insert({
            job_id: jobId,
            photo_url: fileName,
            uploaded_by: user.id
          });

        if (dbError) throw dbError;
      }

      setSelectedFiles([]);
      await loadCompletionPhotos();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload photos');
      return false;
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleProviderMarkComplete = async () => {
    // First upload photos
    const uploaded = await uploadPhotos();
    if (!uploaded) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('job_requests')
        .update({
          provider_completed_at: new Date().toISOString(),
          status: 'pending_completion',
        })
        .eq('id', jobId);

      if (error) throw error;

      // Notify customer that provider marked job complete
      sendNotification({
        type: 'job_completed',
        recipientId: customerId,
        jobTitle,
        jobId,
      });

      toast.success('Job marked as complete! Waiting for customer confirmation.');
      setProviderCompleteDialog(false);
      onStatusUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark job as complete');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomerConfirmCompletion = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('job_requests')
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', jobId);

      if (error) throw error;

      toast.success('Job completed! Thank you for using LawnConnect.');
      setCustomerConfirmDialog(false);
      onStatusUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm job completion');
    } finally {
      setSubmitting(false);
    }
  };

  // Only show for in_progress or pending_completion jobs
  if (status !== 'in_progress' && status !== 'pending_completion' && status !== 'completed') {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-primary" />
                Job Completion
              </CardTitle>
              <CardDescription>
                {status === 'completed' 
                  ? 'This job has been completed'
                  : status === 'pending_completion'
                  ? 'Awaiting customer confirmation'
                  : 'Mark job as complete when finished'}
              </CardDescription>
            </div>
            {status === 'in_progress' && (
              <Badge className="bg-info text-info-foreground gap-1">
                <Clock className="h-3 w-3" /> In Progress
              </Badge>
            )}
            {status === 'pending_completion' && (
              <Badge className="bg-warning text-warning-foreground gap-1">
                <Clock className="h-3 w-3" /> Pending Confirmation
              </Badge>
            )}
            {status === 'completed' && (
              <Badge className="bg-success text-success-foreground gap-1">
                <CheckCircle className="h-3 w-3" /> Completed
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider View - In Progress */}
          {isProvider && status === 'in_progress' && (
            <div className="space-y-4">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Job is in progress</strong>
                  <p className="mt-1 text-sm">
                    Once you've completed the lawn service, upload photos of the finished work and mark the job as complete.
                  </p>
                </AlertDescription>
              </Alert>

              <Button 
                onClick={() => setProviderCompleteDialog(true)} 
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Job as Complete
              </Button>
            </div>
          )}

          {/* Provider View - Pending Completion */}
          {isProvider && status === 'pending_completion' && (
            <div className="space-y-4">
              <Alert className="border-warning/50 bg-warning/10">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Awaiting customer confirmation</strong>
                  <p className="mt-1 text-sm">
                    You marked this job complete on{' '}
                    {providerCompletedAt && format(new Date(providerCompletedAt), 'MMMM dd, yyyy \'at\' h:mm a')}.
                  </p>
                  <p className="mt-1 text-sm">
                    The customer needs to confirm the work is satisfactory before the job is finalized.
                  </p>
                </AlertDescription>
              </Alert>

              {/* Show uploaded completion photos */}
              {completionPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Image className="h-4 w-4" /> Your uploaded photos
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {completionPhotos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.photo_url}
                        alt="Completion photo"
                        className="w-full h-20 object-cover rounded-md"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Provider View - Completed */}
          {isProvider && status === 'completed' && (
            <div className="space-y-4">
              <Alert className="border-success/50 bg-success/10">
                <PartyPopper className="h-4 w-4 text-success" />
                <AlertDescription>
                  <strong>Job completed!</strong>
                  <p className="mt-1 text-sm">
                    The customer confirmed completion on{' '}
                    {completedAt && format(new Date(completedAt), 'MMMM dd, yyyy \'at\' h:mm a')}.
                  </p>
                  <p className="mt-2 text-sm flex items-center gap-1">
                    <Star className="h-3 w-3" /> Don't forget to leave a review for the customer!
                  </p>
                </AlertDescription>
              </Alert>

              {/* Show completion photos */}
              {completionPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Image className="h-4 w-4" /> Completion photos
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {completionPhotos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.photo_url}
                        alt="Completion photo"
                        className="w-full h-20 object-cover rounded-md"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Customer View - In Progress */}
          {isCustomer && status === 'in_progress' && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Job in progress</strong>
                <p className="mt-1 text-sm">
                  {providerName} is working on your lawn. Once they finish, they'll upload photos and mark the job as complete for you to confirm.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Customer View - Pending Completion */}
          {isCustomer && status === 'pending_completion' && (
            <div className="space-y-4">
              <Alert className="border-warning/50 bg-warning/10">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{providerName} has marked the job as complete!</strong>
                  <p className="mt-1 text-sm">
                    Completed on{' '}
                    {providerCompletedAt && format(new Date(providerCompletedAt), 'MMMM dd, yyyy \'at\' h:mm a')}.
                  </p>
                  <p className="mt-1 text-sm">
                    Please review the photos below and confirm completion if you're satisfied.
                  </p>
                </AlertDescription>
              </Alert>

              {/* Show completion photos for customer to review */}
              {completionPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Camera className="h-4 w-4" /> Photos of completed work
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {completionPhotos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.photo_url}
                        alt="Completion photo"
                        className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(photo.photo_url, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={() => setCustomerConfirmDialog(true)} 
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Job Completion
              </Button>
            </div>
          )}

          {/* Customer View - Completed */}
          {isCustomer && status === 'completed' && (
            <div className="space-y-4">
              <Alert className="border-success/50 bg-success/10">
                <PartyPopper className="h-4 w-4 text-success" />
                <AlertDescription>
                  <strong>Job completed!</strong>
                  <p className="mt-1 text-sm">
                    You confirmed completion on{' '}
                    {completedAt && format(new Date(completedAt), 'MMMM dd, yyyy \'at\' h:mm a')}.
                  </p>
                  <p className="mt-2 text-sm flex items-center gap-1">
                    <Star className="h-3 w-3" /> Don't forget to leave a review for {providerName}!
                  </p>
                </AlertDescription>
              </Alert>

              {/* Show completion photos */}
              {completionPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Image className="h-4 w-4" /> Completion photos
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {completionPhotos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.photo_url}
                        alt="Completion photo"
                        className="w-full h-20 object-cover rounded-md cursor-pointer hover:opacity-90"
                        onClick={() => window.open(photo.photo_url, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Complete Dialog with Photo Upload */}
      <Dialog open={providerCompleteDialog} onOpenChange={setProviderCompleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Job as Complete</DialogTitle>
            <DialogDescription>
              Please upload photos of the completed lawn work. These photos will only be visible to you and the customer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Photo upload section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Upload Completion Photos (Required)
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {/* Preview selected files */}
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-20 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedFiles.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add Photos ({selectedFiles.length}/5)
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Upload at least 1 photo showing the completed work. Maximum 5 photos.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setProviderCompleteDialog(false);
              setSelectedFiles([]);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleProviderMarkComplete} 
              disabled={submitting || uploadingPhotos || selectedFiles.length === 0}
            >
              {uploadingPhotos ? 'Uploading...' : submitting ? 'Submitting...' : 'Complete Job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Confirm Dialog */}
      <Dialog open={customerConfirmDialog} onOpenChange={setCustomerConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Job Completion</DialogTitle>
            <DialogDescription>
              Are you satisfied with the lawn service provided by {providerName}?
              <br /><br />
              By confirming, you acknowledge that the work has been completed to your satisfaction.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomerConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomerConfirmCompletion} disabled={submitting}>
              {submitting ? 'Confirming...' : 'Yes, I\'m Satisfied'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}