import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  Clock,
  Flag,
  PartyPopper,
  Star,
  Camera,
  Upload,
  X,
  Image,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { safeToast } from "@/lib/errorHandler";
import { format } from "date-fns";
import { sendNotification } from "@/lib/notifications";

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
  customerName: string;
  preferredDate: string | null;
  finalPrice: number | null;
  onStatusUpdate: () => void;
}

interface CompletionPhoto {
  id: string;
  photo_url: string;
  photo_type: "before" | "after";
  created_at: string;
}

interface Dispute {
  id: string;
  reason: string;
  status: string;
  created_at: string;
}

interface DisputeResponse {
  id: string;
  response_text: string;
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
  customerName,
  preferredDate,
  finalPrice,
  onStatusUpdate,
}: JobCompletionCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [providerCompleteDialog, setProviderCompleteDialog] = useState(false);
  const [customerConfirmDialog, setCustomerConfirmDialog] = useState(false);
  const [disputeDialog, setDisputeDialog] = useState(false);
  const [lateWarningDialog, setLateWarningDialog] = useState(false);
  const [providerResponseDialog, setProviderResponseDialog] = useState(false);
  const [lateJobsCount, setLateJobsCount] = useState(0);
  const [disputeReason, setDisputeReason] = useState("");
  const [providerResponseText, setProviderResponseText] = useState("");
  const [completionPhotos, setCompletionPhotos] = useState<CompletionPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedBeforeFiles, setSelectedBeforeFiles] = useState<File[]>([]);
  const [selectedAfterFiles, setSelectedAfterFiles] = useState<File[]>([]);
  const [previewBeforeUrls, setPreviewBeforeUrls] = useState<string[]>([]);
  const [previewAfterUrls, setPreviewAfterUrls] = useState<string[]>([]);
  const [activeDispute, setActiveDispute] = useState<Dispute | null>(null);
  const [disputePhotos, setDisputePhotos] = useState<{ id: string; photo_url: string }[]>([]);
  const [disputeResponses, setDisputeResponses] = useState<DisputeResponse[]>([]);
  const [selectedDisputeFiles, setSelectedDisputeFiles] = useState<File[]>([]);
  const [previewDisputeUrls, setPreviewDisputeUrls] = useState<string[]>([]);
  const [selectedResponseFiles, setSelectedResponseFiles] = useState<File[]>([]);
  const [previewResponseUrls, setPreviewResponseUrls] = useState<string[]>([]);
  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);
  const disputeFileInputRef = useRef<HTMLInputElement>(null);
  const responseFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCompletionPhotos();
    loadActiveDispute();
  }, [jobId]);

  useEffect(() => {
    const urls = selectedBeforeFiles.map((file) => URL.createObjectURL(file));
    setPreviewBeforeUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedBeforeFiles]);

  useEffect(() => {
    const urls = selectedAfterFiles.map((file) => URL.createObjectURL(file));
    setPreviewAfterUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedAfterFiles]);

  useEffect(() => {
    const urls = selectedDisputeFiles.map((file) => URL.createObjectURL(file));
    setPreviewDisputeUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedDisputeFiles]);

  useEffect(() => {
    const urls = selectedResponseFiles.map((file) => URL.createObjectURL(file));
    setPreviewResponseUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedResponseFiles]);

  const loadCompletionPhotos = async () => {
    const { data, error } = await supabase
      .from("job_completion_photos")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const photosWithUrls = await Promise.all(
        data.map(async (photo: any) => {
          const { data: signedUrlData } = await supabase.storage
            .from("completion-photos")
            .createSignedUrl(photo.photo_url, 3600);
          return {
            ...photo,
            photo_url: signedUrlData?.signedUrl || photo.photo_url,
            photo_type: photo.photo_type || "after",
          };
        }),
      );
      setCompletionPhotos(photosWithUrls);
    }
  };

  const loadActiveDispute = async () => {
    const { data, error } = await supabase
      .from("job_disputes")
      .select("*")
      .eq("job_id", jobId)
      .eq("status", "open")
      .maybeSingle();

    if (!error && data) {
      setActiveDispute(data);
      await loadDisputePhotos(data.id);
      await loadDisputeResponses(data.id);
    }
  };

  const loadDisputePhotos = async (disputeId: string) => {
    const { data, error } = await supabase.from("dispute_photos").select("*").eq("dispute_id", disputeId);

    if (!error && data) {
      const photosWithUrls = await Promise.all(
        data.map(async (photo: any) => {
          const { data: signedUrlData } = await supabase.storage
            .from("completion-photos")
            .createSignedUrl(photo.photo_url, 3600);
          return {
            id: photo.id,
            photo_url: signedUrlData?.signedUrl || photo.photo_url,
          };
        }),
      );
      setDisputePhotos(photosWithUrls);
    }
  };

  const loadDisputeResponses = async (disputeId: string) => {
    const { data, error } = await supabase
      .from("dispute_responses")
      .select("*")
      .eq("dispute_id", disputeId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setDisputeResponses(data);
    }
  };

  const handleBeforeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedBeforeFiles.length > 5) {
      toast.error("Maximum 5 before photos allowed");
      return;
    }
    setSelectedBeforeFiles((prev) => [...prev, ...files]);
  };

  const handleAfterFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedAfterFiles.length > 5) {
      toast.error("Maximum 5 after photos allowed");
      return;
    }
    setSelectedAfterFiles((prev) => [...prev, ...files]);
  };

  const handleDisputeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedDisputeFiles.length > 5) {
      toast.error("Maximum 5 photos allowed");
      return;
    }
    setSelectedDisputeFiles((prev) => [...prev, ...files]);
  };

  const handleResponseFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedResponseFiles.length > 5) {
      toast.error("Maximum 5 photos allowed");
      return;
    }
    setSelectedResponseFiles((prev) => [...prev, ...files]);
  };

  const removeBeforeFile = (index: number) => {
    setSelectedBeforeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeAfterFile = (index: number) => {
    setSelectedAfterFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeDisputeFile = (index: number) => {
    setSelectedDisputeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeResponseFile = (index: number) => {
    setSelectedResponseFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<boolean> => {
    if (selectedBeforeFiles.length === 0 || selectedAfterFiles.length === 0) {
      toast.error("Please upload at least one before photo and one after photo");
      return false;
    }

    setUploadingPhotos(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload before photos
      for (const file of selectedBeforeFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${jobId}/before_${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from("completion-photos").upload(fileName, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("job_completion_photos").insert({
          job_id: jobId,
          photo_url: fileName,
          uploaded_by: user.id,
          photo_type: "before",
        });

        if (dbError) throw dbError;
      }

      // Upload after photos
      for (const file of selectedAfterFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${jobId}/after_${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from("completion-photos").upload(fileName, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("job_completion_photos").insert({
          job_id: jobId,
          photo_url: fileName,
          uploaded_by: user.id,
          photo_type: "after",
        });

        if (dbError) throw dbError;
      }

      setSelectedBeforeFiles([]);
      setSelectedAfterFiles([]);
      await loadCompletionPhotos();
      return true;
    } catch (error) {
      safeToast.error(error);
      return false;
    } finally {
      setUploadingPhotos(false);
    }
  };

  const checkIfLate = (): boolean => {
    if (!preferredDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(preferredDate);
    dueDate.setHours(0, 0, 0, 0);
    return today > dueDate;
  };

  const handleProviderMarkComplete = async () => {
    const uploaded = await uploadPhotos();
    if (!uploaded) return;

    const isLate = checkIfLate();

    setSubmitting(true);
    try {
      // Update job with completion and late flag
      const { error } = await supabase
        .from("job_requests")
        .update({
          provider_completed_at: new Date().toISOString(),
          status: "pending_completion",
          is_late_completion: isLate,
        })
        .eq("id", jobId);

      if (error) throw error;

      // If there was an active dispute, resolve it
      if (activeDispute) {
        await supabase
          .from("job_disputes")
          .update({
            status: "resolved",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", activeDispute.id);
        setActiveDispute(null);
      }

      // Send completion confirmation needed notification to customer
      sendNotification({
        type: "completion_confirmation_needed",
        recipientId: customerId,
        jobTitle,
        jobId,
        additionalData: {
          providerName,
        },
      });

      // If late, send additional notifications
      if (isLate) {
        // Get late jobs count for provider
        const { data: lateCount } = await supabase.rpc("get_provider_late_jobs_this_month", {
          provider_id: providerId,
        });

        const lateJobsThisMonth = (lateCount || 0) + 1;
        setLateJobsCount(lateJobsThisMonth);

        // Send late warning to provider
        sendNotification({
          type: "late_completion_warning",
          recipientId: providerId,
          jobTitle,
          jobId,
          additionalData: {
            lateJobsThisMonth,
            preferredDate: preferredDate ? format(new Date(preferredDate), "MMMM dd, yyyy") : undefined,
          },
        });

        // Send apology to customer
        sendNotification({
          type: "late_completion_apology",
          recipientId: customerId,
          jobTitle,
          jobId,
          additionalData: {
            providerName,
            preferredDate: preferredDate ? format(new Date(preferredDate), "MMMM dd, yyyy") : undefined,
          },
        });

        // Show late warning dialog to provider
        setProviderCompleteDialog(false);
        setLateWarningDialog(true);
      } else {
        toast.success("Job marked as complete! Waiting for customer confirmation.");
        setProviderCompleteDialog(false);
      }

      onStatusUpdate();
    } catch (error) {
      safeToast.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomerConfirmCompletion = async () => {
    setSubmitting(true);
    try {
      // Get provider's dispute count this month
      const { data: disputeCount } = await supabase.rpc("get_provider_disputes_this_month", {
        provider_id: providerId,
      });

      // Calculate payout percentage (70% normally, 60% if 3+ disputes)
      const payoutPercentage = (disputeCount || 0) >= 3 ? 0.6 : 0.7;
      const providerPayout = finalPrice ? finalPrice * payoutPercentage : null;
      const platformFee = finalPrice ? finalPrice * (1 - payoutPercentage) : null;

      const { error } = await supabase
        .from("job_requests")
        .update({
          completed_at: new Date().toISOString(),
          status: "completed",
          provider_payout: providerPayout,
          platform_fee: platformFee,
        })
        .eq("id", jobId);

      if (error) throw error;

      toast.success("Job completed! Thank you for using LawnConnect.");
      setCustomerConfirmDialog(false);
      onStatusUpdate();
    } catch (error) {
      safeToast.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisputeSubmit = async () => {
    if (!disputeReason.trim()) {
      toast.error("Please provide a reason for the dispute");
      return;
    }

    if (selectedDisputeFiles.length === 0) {
      toast.error("Please upload at least one photo as evidence");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create dispute
      const { data: disputeData, error: disputeError } = await supabase
        .from("job_disputes")
        .insert({
          job_id: jobId,
          customer_id: user.id,
          reason: disputeReason.trim(),
        })
        .select()
        .single();

      if (disputeError) throw disputeError;

      // Upload dispute photos
      for (const file of selectedDisputeFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `disputes/${disputeData.id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from("completion-photos").upload(fileName, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("dispute_photos").insert({
          dispute_id: disputeData.id,
          photo_url: fileName,
          uploaded_by: user.id,
        });

        if (dbError) throw dbError;
      }

      // Update job status back to in_progress
      const { error: jobError } = await supabase
        .from("job_requests")
        .update({
          status: "in_progress",
          provider_completed_at: null,
        })
        .eq("id", jobId);

      if (jobError) throw jobError;

      // Send notification to provider
      sendNotification({
        type: "dispute_opened",
        recipientId: providerId,
        jobTitle,
        jobId,
        additionalData: {
          customerName,
          disputeReason: disputeReason.trim(),
        },
      });

      toast.success("Dispute submitted. The provider will be notified to address your concerns.");
      setDisputeDialog(false);
      setDisputeReason("");
      setSelectedDisputeFiles([]);
      await loadActiveDispute();
      onStatusUpdate();
    } catch (error) {
      safeToast.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProviderResponse = async () => {
    if (!providerResponseText.trim()) {
      toast.error("Please provide a response");
      return;
    }

    if (!activeDispute) {
      toast.error("No active dispute found");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create response
      const { data: responseData, error: responseError } = await supabase
        .from("dispute_responses")
        .insert({
          dispute_id: activeDispute.id,
          provider_id: user.id,
          response_text: providerResponseText.trim(),
        })
        .select()
        .single();

      if (responseError) throw responseError;

      // Upload response photos if any
      for (const file of selectedResponseFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `responses/${responseData.id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from("completion-photos").upload(fileName, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("dispute_response_photos").insert({
          response_id: responseData.id,
          photo_url: fileName,
          uploaded_by: user.id,
        });

        if (dbError) throw dbError;
      }

      // Send notification to customer
      sendNotification({
        type: "dispute_response",
        recipientId: customerId,
        jobTitle,
        jobId,
        additionalData: {
          providerName,
        },
      });

      toast.success("Response submitted successfully.");
      setProviderResponseDialog(false);
      setProviderResponseText("");
      setSelectedResponseFiles([]);
      await loadDisputeResponses(activeDispute.id);
    } catch (error) {
      safeToast.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const beforePhotos = completionPhotos.filter((p) => p.photo_type === "before");
  const afterPhotos = completionPhotos.filter((p) => p.photo_type === "after");

  if (status !== "accepted" && status !== "in_progress" && status !== "pending_completion" && status !== "completed") {
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
                {status === "completed"
                  ? "This job has been completed"
                  : status === "pending_completion"
                    ? "Awaiting customer confirmation"
                    : "Mark job as complete when finished"}
              </CardDescription>
            </div>
            {(status === "accepted" || status === "in_progress") && (
              <Badge className="bg-info text-info-foreground gap-1">
                <Clock className="h-3 w-3" /> {status === "accepted" ? "Accepted" : "In Progress"}
              </Badge>
            )}
            {status === "pending_completion" && (
              <Badge className="bg-warning text-warning-foreground gap-1">
                <Clock className="h-3 w-3" /> Pending Confirmation
              </Badge>
            )}
            {status === "completed" && (
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
                    ? `You disputed this job on ${format(new Date(activeDispute.created_at), "MMMM dd, yyyy")}.`
                    : `The customer disputed the completion on ${format(new Date(activeDispute.created_at), "MMMM dd, yyyy")}.`}
                </p>
                <p className="mt-1 text-sm font-medium">Reason: {activeDispute.reason}</p>

                {/* Show dispute photos */}
                {disputePhotos.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium">Customer's evidence photos:</p>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      {disputePhotos.map((photo) => (
                        <img
                          key={photo.id}
                          src={photo.photo_url}
                          alt="Dispute evidence"
                          className="w-full h-16 object-cover rounded cursor-pointer"
                          onClick={() => window.open(photo.photo_url, "_blank")}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Show responses */}
                {disputeResponses.length > 0 && (
                  <div className="mt-2 border-t border-destructive/20 pt-2">
                    <p className="text-xs font-medium">Provider response:</p>
                    {disputeResponses.map((response) => (
                      <p key={response.id} className="text-sm mt-1 bg-background/50 p-2 rounded">
                        {response.response_text}
                      </p>
                    ))}
                  </div>
                )}

                {isProvider && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm">Please address the customer's concerns and upload new completion photos.</p>
                    <Button variant="outline" size="sm" onClick={() => setProviderResponseDialog(true)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Respond to Dispute
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Provider View - Accepted / In Progress */}
          {isProvider && (status === "accepted" || status === "in_progress") && (
            <div className="space-y-4">
              {!activeDispute && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{status === "accepted" ? "Job accepted" : "Job is in progress"}</strong>
                    <p className="mt-1 text-sm">
                      Once you've completed the lawn service, upload before and after photos and mark the job as
                      complete.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={() => setProviderCompleteDialog(true)} className="w-full">
                <CheckCircle className="h-4 w-4 mr-2" />
                {activeDispute ? "Upload New Photos & Resubmit" : "Mark Job as Complete"}
              </Button>
            </div>
          )}

          {/* Provider View - Pending Completion */}
          {isProvider && status === "pending_completion" && (
            <div className="space-y-4">
              <Alert className="border-warning/50 bg-warning/10">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Awaiting customer confirmation</strong>
                  <p className="mt-1 text-sm">
                    You marked this job complete on{" "}
                    {providerCompletedAt && format(new Date(providerCompletedAt), "MMMM dd, yyyy 'at' h:mm a")}.
                  </p>
                  <p className="mt-1 text-sm">
                    The customer needs to confirm the work is completed before payment is released.
                  </p>
                </AlertDescription>
              </Alert>

              {/* Show before/after photos */}
              {beforePhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Image className="h-4 w-4" /> Before photos
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {beforePhotos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.photo_url}
                        alt="Before photo"
                        className="w-full h-20 object-cover rounded-md"
                      />
                    ))}
                  </div>
                </div>
              )}
              {afterPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Image className="h-4 w-4" /> After photos
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {afterPhotos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.photo_url}
                        alt="After photo"
                        className="w-full h-20 object-cover rounded-md"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Provider View - Completed */}
          {isProvider && status === "completed" && (
            <div className="space-y-4">
              <Alert className="border-success/50 bg-success/10">
                <PartyPopper className="h-4 w-4 text-success" />
                <AlertDescription>
                  <strong>Job completed!</strong>
                  <p className="mt-1 text-sm">
                    The customer confirmed completion on{" "}
                    {completedAt && format(new Date(completedAt), "MMMM dd, yyyy 'at' h:mm a")}.
                  </p>
                  <p className="mt-2 text-sm flex items-center gap-1">
                    <Star className="h-3 w-3" /> Don't forget to leave a review for the customer!
                  </p>
                </AlertDescription>
              </Alert>

              {afterPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Image className="h-4 w-4" /> Completion photos
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {afterPhotos.map((photo) => (
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
          {isCustomer && status === "in_progress" && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Job in progress</strong>
                <p className="mt-1 text-sm">
                  {providerName} is working on your lawn. Once they finish, they'll upload before and after photos for
                  you to confirm.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Customer View - Pending Completion */}
          {isCustomer && status === "pending_completion" && (
            <div className="space-y-4">
              <Alert className="border-warning/50 bg-warning/10">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{providerName} has marked the job as complete!</strong>
                  <p className="mt-1 text-sm">
                    Completed on{" "}
                    {providerCompletedAt && format(new Date(providerCompletedAt), "MMMM dd, yyyy 'at' h:mm a")}.
                  </p>
                  <p className="mt-1 text-sm">
                    Please review the before and after photos and confirm if you're satisfied.
                  </p>
                </AlertDescription>
              </Alert>

              {/* Before photos */}
              {beforePhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Camera className="h-4 w-4" /> Before photos
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {beforePhotos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.photo_url}
                        alt="Before photo"
                        className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(photo.photo_url, "_blank")}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* After photos */}
              {afterPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Camera className="h-4 w-4" /> After photos
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {afterPhotos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.photo_url}
                        alt="After photo"
                        className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(photo.photo_url, "_blank")}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => setCustomerConfirmDialog(true)} className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Completion
                </Button>
                <Button variant="destructive" onClick={() => setDisputeDialog(true)} className="flex-1">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Report Issue
                </Button>
              </div>
            </div>
          )}

          {/* Customer View - Completed */}
          {isCustomer && status === "completed" && (
            <div className="space-y-4">
              <Alert className="border-success/50 bg-success/10">
                <PartyPopper className="h-4 w-4 text-success" />
                <AlertDescription>
                  <strong>Job completed!</strong>
                  <p className="mt-1 text-sm">
                    You confirmed completion on{" "}
                    {completedAt && format(new Date(completedAt), "MMMM dd, yyyy 'at' h:mm a")}.
                  </p>
                  <p className="mt-2 text-sm flex items-center gap-1">
                    <Star className="h-3 w-3" /> Don't forget to leave a review for {providerName}!
                  </p>
                </AlertDescription>
              </Alert>

              {afterPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Image className="h-4 w-4" /> Completion photos
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {afterPhotos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.photo_url}
                        alt="Completion photo"
                        className="w-full h-20 object-cover rounded-md cursor-pointer hover:opacity-90"
                        onClick={() => window.open(photo.photo_url, "_blank")}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Complete Dialog with Before/After Photo Upload */}
      <Dialog open={providerCompleteDialog} onOpenChange={setProviderCompleteDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeDispute ? "Resubmit Completion" : "Mark Job as Complete"}</DialogTitle>
            <DialogDescription>
              {activeDispute
                ? "Please upload new before and after photos addressing the customer's concerns."
                : "Please upload before and after photos of the lawn work. Both are required."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Before Photos Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Before Photos (Required)</label>
              <input
                type="file"
                ref={beforeFileInputRef}
                accept="image/*"
                multiple
                onChange={handleBeforeFileSelect}
                className="hidden"
              />

              {previewBeforeUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {previewBeforeUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <img src={url} alt={`Before ${index + 1}`} className="w-full h-20 object-cover rounded-md" />
                      <button
                        type="button"
                        onClick={() => removeBeforeFile(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedBeforeFiles.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => beforeFileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add Before Photos ({selectedBeforeFiles.length}/5)
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Photos showing the lawn before you started work</p>
            </div>

            {/* After Photos Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">After Photos (Required)</label>
              <input
                type="file"
                ref={afterFileInputRef}
                accept="image/*"
                multiple
                onChange={handleAfterFileSelect}
                className="hidden"
              />

              {previewAfterUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {previewAfterUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <img src={url} alt={`After ${index + 1}`} className="w-full h-20 object-cover rounded-md" />
                      <button
                        type="button"
                        onClick={() => removeAfterFile(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedAfterFiles.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => afterFileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add After Photos ({selectedAfterFiles.length}/5)
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Photos showing the completed work</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setProviderCompleteDialog(false);
                setSelectedBeforeFiles([]);
                setSelectedAfterFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProviderMarkComplete}
              disabled={
                submitting || uploadingPhotos || selectedBeforeFiles.length === 0 || selectedAfterFiles.length === 0
              }
            >
              {uploadingPhotos ? "Uploading..." : submitting ? "Submitting..." : "Complete Job"}
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
              <br />
              <br />
              By confirming, you acknowledge that the work has been completed to your satisfaction and payment will be
              released to the provider.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomerConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomerConfirmCompletion} disabled={submitting}>
              {submitting ? "Confirming..." : "Yes, I'm Satisfied"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog with Photo Upload */}
      <Dialog open={disputeDialog} onOpenChange={setDisputeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
            <DialogDescription>
              If you're not satisfied with the work, please upload photos showing the issue and explain what's wrong.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload Photos (Required)</label>
              <input
                type="file"
                ref={disputeFileInputRef}
                accept="image/*"
                multiple
                onChange={handleDisputeFileSelect}
                className="hidden"
              />

              {previewDisputeUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {previewDisputeUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <img src={url} alt={`Evidence ${index + 1}`} className="w-full h-20 object-cover rounded-md" />
                      <button
                        type="button"
                        onClick={() => removeDisputeFile(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedDisputeFiles.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => disputeFileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add Photos ({selectedDisputeFiles.length}/5)
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Photos showing the issue with the completed work</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">What's the issue with the completed work?</label>
              <Textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Please describe what needs to be fixed or improved..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDisputeDialog(false);
                setDisputeReason("");
                setSelectedDisputeFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisputeSubmit}
              disabled={submitting || !disputeReason.trim() || selectedDisputeFiles.length === 0}
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provider Response Dialog */}
      <Dialog open={providerResponseDialog} onOpenChange={setProviderResponseDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Respond to Dispute</DialogTitle>
            <DialogDescription>
              Explain how you've addressed the customer's concerns. You can also upload additional photos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Response</label>
              <Textarea
                value={providerResponseText}
                onChange={(e) => setProviderResponseText(e.target.value)}
                placeholder="Explain how you addressed the issue..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Photos (Optional)</label>
              <input
                type="file"
                ref={responseFileInputRef}
                accept="image/*"
                multiple
                onChange={handleResponseFileSelect}
                className="hidden"
              />

              {previewResponseUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {previewResponseUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <img src={url} alt={`Response ${index + 1}`} className="w-full h-20 object-cover rounded-md" />
                      <button
                        type="button"
                        onClick={() => removeResponseFile(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedResponseFiles.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => responseFileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add Photos ({selectedResponseFiles.length}/5)
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setProviderResponseDialog(false);
                setProviderResponseText("");
                setSelectedResponseFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleProviderResponse} disabled={submitting || !providerResponseText.trim()}>
              {submitting ? "Submitting..." : "Submit Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Late Completion Warning Dialog */}
      <Dialog open={lateWarningDialog} onOpenChange={setLateWarningDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Late Completion Warning
            </DialogTitle>
            <DialogDescription>
              This job was completed after the customer's preferred date of{" "}
              <strong>{preferredDate ? format(new Date(preferredDate), "MMMM dd, yyyy") : "N/A"}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="border-warning/50 bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription>
                <p className="font-medium">Late jobs this month: {lateJobsCount}/3</p>
                <p className="mt-2 text-sm">
                  If you accumulate 3 or more late completions in a calendar month, you may lose certain benefits
                  including:
                </p>
                <ul className="mt-2 text-sm list-disc list-inside">
                  <li>Priority listing in search results</li>
                  <li>Featured provider badge</li>
                  <li>Premium account perks</li>
                </ul>
              </AlertDescription>
            </Alert>

            <p className="text-sm text-muted-foreground">
              We've sent an apology notification to the customer on your behalf. Please try to complete future jobs by
              their preferred dates to maintain your standing.
            </p>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setLateWarningDialog(false);
                toast.success("Job marked as complete! Waiting for customer confirmation.");
              }}
            >
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
