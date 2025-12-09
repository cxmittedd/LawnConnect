import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Upload, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type DocumentType = 'drivers_license' | 'passport' | 'national_id';
type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface VerificationData {
  id: string;
  document_type: DocumentType;
  document_url: string;
  status: VerificationStatus;
  submitted_at: string;
  rejection_reason: string | null;
}

export function ProviderVerification() {
  const { user } = useAuth();
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>('national_id');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadVerification();
  }, [user]);

  const loadVerification = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('provider_verifications')
        .select('*')
        .eq('provider_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setVerification(data as VerificationData | null);
    } catch (error) {
      console.error('Error loading verification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
        toast.error('Only JPG, PNG, WebP or PDF files are allowed');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedFile) return;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('id-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('id-documents')
        .getPublicUrl(fileName);

      // For rejected verifications, update; otherwise insert
      if (verification?.status === 'rejected') {
        const { error } = await supabase
          .from('provider_verifications')
          .update({
            document_type: documentType,
            document_url: fileName,
            status: 'pending',
            submitted_at: new Date().toISOString(),
            rejection_reason: null,
          })
          .eq('provider_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('provider_verifications')
          .insert({
            provider_id: user.id,
            document_type: documentType,
            document_url: fileName,
          });

        if (error) throw error;
      }

      toast.success('ID document submitted for verification!');
      setSelectedFile(null);
      loadVerification();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit document');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground gap-1"><Clock className="h-3 w-3" /> Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-success text-success-foreground gap-1"><CheckCircle className="h-3 w-3" /> Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
    }
  };

  const getDocumentTypeLabel = (type: DocumentType) => {
    switch (type) {
      case 'drivers_license': return "Driver's License";
      case 'passport': return 'Passport';
      case 'national_id': return 'National ID';
    }
  };

  // Show existing verification status
  if (verification && verification.status !== 'rejected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            ID Verification
          </CardTitle>
          <CardDescription>
            Your identity verification status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Status</span>
            {getStatusBadge(verification.status)}
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Document Type</span>
            <span className="font-medium">{getDocumentTypeLabel(verification.document_type)}</span>
          </div>
          
          {verification.status === 'pending' && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Your ID is under review. This typically takes 1-2 business days. 
                You'll be able to browse jobs once approved.
              </AlertDescription>
            </Alert>
          )}
          
          {verification.status === 'approved' && (
            <Alert className="border-success bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription>
                Your account is verified! You have full access to browse and accept jobs.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show form for new submission or resubmission after rejection
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          ID Verification Required
        </CardTitle>
        <CardDescription>
          Submit a valid government-issued ID to verify your identity and access job listings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {verification?.status === 'rejected' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Previous submission rejected:</strong> {verification.rejection_reason || 'Please submit a clearer document.'}
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You must verify your identity before you can browse available jobs. 
            Upload a clear photo of your ID document.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="document_type">Document Type</Label>
          <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="national_id">National ID</SelectItem>
              <SelectItem value="drivers_license">Driver's License</SelectItem>
              <SelectItem value="passport">Passport</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="id_document">Upload Document</Label>
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
            <input
              id="id_document"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="id_document" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              {selectedFile ? (
                <p className="text-sm text-primary font-medium">{selectedFile.name}</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP or PDF (max 5MB)</p>
                </>
              )}
            </label>
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={!selectedFile || uploading}
          className="w-full"
        >
          {uploading ? 'Uploading...' : 'Submit for Verification'}
        </Button>
      </CardContent>
    </Card>
  );
}
