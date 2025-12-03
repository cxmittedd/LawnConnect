import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Clock, Flag, PartyPopper, Star, Camera, Upload, X, Image, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sendNotification } from '@/lib/notifications';

interface JobCompletionCardProps {
  jobId: string;
  jobTitle: string;
  customerId: string;
  providerId: string;
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

interface Dispute {
  id: string;
  reason: string;
  status: string;
  created_at: string;
}

export function JobCompletionCard({
  jobId,
  jobTitle,
  customerId,
  providerId,
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
  const [disputeDialog, setDisputeDialog] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [completionPhotos, setCompletionPhotos] = useState<CompletionPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [activeDispute, setActiveDispute] = useState<Dispute | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCompletionPhotos();
    loadActiveDispute();
  }, [jobId]);

  useEffect(() => {
    const urls = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [selectedFiles]);

  const loadCompletionPhotos = async () => {
    const { data, error } = await supabase
      .from('job_completion_photos')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const photosWithUrls = await Promise.all(
        data.map(async (photo) => {
          const { data: signedUrlData } = await supabase.storage
            .from('completion-photos')
            .createSignedUrl(photo.photo_url, 3600);
          return {
            ...photo,
            photo_url: signedUrlData?.signedUrl || photo.photo_url
          };
        })
      );
      setCompletionPhotos(photosWithUrls);
    }
  };

  const loadActiveDispute = async () => {
    const { data, error } = await supabase
      .from('job_disputes')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'open')
      .maybeSingle();

    if (!error && data) {
      setActiveDispute(data);
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

        const { error: uploadError } = await supabase.storage
          .from('completion-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

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

      // If there was an active dispute, resolve it
      if (activeDispute) {
        await supabase
          .from('job_disputes')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString()
          })
          .eq('id', activeDispute.id);
        setActiveDispute(null);
      }

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

  const handleDisputeSubmit = async () => {
    if (!disputeReason.trim()) {
      toast.error('Please provide a reason for the dispute');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create dispute
      const { error: disputeError } = await supabase
        .from('job_disputes')
        .insert({
          job_id: jobId,
          customer_id: user.id,
          reason: disputeReason.trim()
        });

      if (disputeError) throw disputeError;

      // Update job status back to in_progress
      const { error: jobError } = await supabase
        .from('job_requests')
        .update({
          status: 'in_progress',
          provider_completed_at: null
        })
        .eq('id', jobId);

      if (jobError) throw jobError;

      toast.success('Dispute submitted. The provider will be notified to address your concerns.');
      setDisputeDialog(false);
      setDisputeReason('');
      await loadActiveDispute();
      onStatusUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit dispute');
    } finally {
      setSubmitting(false);
    }
  };

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
          {/* Active Dispute Alert */}
          {activeDispute && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription>
                <strong>Dispute Active</strong>
                <p className="mt-1 text-sm">
                  {isCustomer 
                    ? `You disputed this job on ${format(new Date(activeDispute.created_at), 'MMMM dd, yyyy')}.`
                    : `The customer disputed the completion on ${format(new Date(activeDispute.created_at), 'MMMM dd, yyyy')}.`
                  }
                </p>
                <p className="mt-1 text-sm font-medium">Reason: {activeDispute.reason}</p>
                {isProvider && (
                  <p className="mt-2 text-sm">
                    Please address the customer's concerns and upload new completion photos.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Provider View - In Progress */}
          {isProvider && status === 'in_progress' && (
            <div className="space-y-4">
              {!activeDispute && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Job is in progress</strong>
                    <p className="mt-1 text-sm">
                      Once you've completed the lawn service, upload photos of the finished work and mark the job as complete.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={() => setProviderCompleteDialog(true)} 
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {activeDispute ? 'Upload New Photos & Resubmit' : 'Mark Job as Complete'}
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

              <div className="flex gap-2">
                <Button 
                  onClick={() => setCustomerConfirmDialog(true)} 
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Completion
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => setDisputeDialog(true)} 
                  className="flex-1"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Dispute
                </Button>
              </div>
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
            <DialogTitle>
              {activeDispute ? 'Resubmit Completion' : 'Mark Job as Complete'}
            </DialogTitle>
            <DialogDescription>
              {activeDispute 
                ? 'Please upload new photos addressing the customer\'s concerns. These photos will only be visible to you and the customer.'
                : 'Please upload photos of the completed lawn work. These photos will only be visible to you and the customer.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
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

      {/* Dispute Dialog */}
      <Dialog open={disputeDialog} onOpenChange={setDisputeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute Job Completion</DialogTitle>
            <DialogDescription>
              If you're not satisfied with the work, please explain what's wrong. The provider will be notified to address your concerns and upload new photos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                What's the issue with the completed work?
              </label>
              <Textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Please describe what needs to be fixed or improved..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDisputeDialog(false);
              setDisputeReason('');
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDisputeSubmit} 
              disabled={submitting || !disputeReason.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit Dispute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}