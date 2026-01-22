import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  UserCheck, 
  FileText, 
  Camera, 
  Landmark, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Briefcase,
  Shield,
  Clock,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProviderWalkthroughProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idVerificationStatus?: 'pending' | 'approved' | 'rejected' | null;
  bankingStatus?: 'pending' | 'verified' | 'rejected' | null;
}

const WALKTHROUGH_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to LawnConnect!',
    subtitle: 'Your journey to becoming a verified provider',
    description: 'Thank you for joining LawnConnect as a service provider. Before you can start accepting jobs and earning money, you need to complete a quick verification process. This ensures trust and safety for everyone on our platform.',
    icon: Star,
    highlights: [
      'Earn money on your own schedule',
      'Connect with customers in your area',
      'Build your reputation with reviews',
      'Get paid securely every two weeks'
    ]
  },
  {
    id: 'id-verification',
    title: 'Step 1: ID Verification',
    subtitle: 'Verify your identity',
    description: 'Upload a valid government-issued ID to confirm your identity. This is a one-time process that helps build trust with customers.',
    icon: FileText,
    requirements: [
      { label: 'Driver\'s License', detail: 'Upload front and back' },
      { label: 'Passport', detail: 'Upload passport page' },
      { label: 'National ID', detail: 'Upload front only' }
    ],
    tip: 'Make sure your ID photos are clear, well-lit, and all text is readable.'
  },
  {
    id: 'selfie',
    title: 'Step 2: Selfie Verification',
    subtitle: 'Take a live photo',
    description: 'Take a selfie to verify that you are the person in your ID document. This adds an extra layer of security.',
    icon: Camera,
    requirements: [
      { label: 'Clear face photo', detail: 'Look directly at the camera' },
      { label: 'Good lighting', detail: 'Make sure your face is visible' },
      { label: 'No filters', detail: 'Use your natural appearance' }
    ],
    tip: 'Our system will automatically detect your face to ensure a valid photo.'
  },
  {
    id: 'banking',
    title: 'Step 3: Banking Details',
    subtitle: 'Set up your payout account',
    description: 'Enter your banking information so we can pay you for completed jobs. Payouts are processed every two weeks.',
    icon: Landmark,
    requirements: [
      { label: 'Jamaican Bank Account', detail: 'Scotiabank or NCB only' },
      { label: 'Full Legal Name', detail: 'Must match your bank account' },
      { label: 'TRN Number', detail: 'Your 9-digit tax registration number' }
    ],
    tip: 'Double-check your account number to avoid payment delays.'
  },
  {
    id: 'review',
    title: 'Step 4: Admin Review',
    subtitle: 'We verify your documents',
    description: 'Our team will review your submitted documents. This typically takes 1-2 business days. You\'ll receive a notification once approved.',
    icon: Clock,
    timeline: [
      { label: 'Documents Submitted', status: 'complete' },
      { label: 'Under Review', status: 'active' },
      { label: 'Approved', status: 'pending' }
    ],
    tip: 'You\'ll receive an email and in-app notification when your verification is complete.'
  },
  {
    id: 'ready',
    title: 'You\'re All Set!',
    subtitle: 'Start earning with LawnConnect',
    description: 'Once verified, you can browse available jobs, submit proposals, and start earning. Build your reputation by delivering great service!',
    icon: Briefcase,
    benefits: [
      { icon: Shield, label: 'Trusted Platform', detail: 'Verified customers and secure payments' },
      { icon: CheckCircle, label: 'Flexible Schedule', detail: 'Accept jobs that fit your availability' },
      { icon: Star, label: 'Build Reputation', detail: 'Earn reviews and attract more customers' }
    ]
  }
];

export function ProviderWalkthrough({ 
  open, 
  onOpenChange,
  idVerificationStatus,
  bankingStatus 
}: ProviderWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = WALKTHROUGH_STEPS[currentStep];
  const Icon = step.icon;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WALKTHROUGH_STEPS.length - 1;

  const getStepStatus = (stepId: string) => {
    if (stepId === 'id-verification' || stepId === 'selfie') {
      if (idVerificationStatus === 'approved') return 'complete';
      if (idVerificationStatus === 'pending') return 'pending';
      if (idVerificationStatus === 'rejected') return 'rejected';
      return 'incomplete';
    }
    if (stepId === 'banking') {
      if (bankingStatus === 'verified') return 'complete';
      if (bankingStatus === 'pending') return 'pending';
      if (bankingStatus === 'rejected') return 'rejected';
      return 'incomplete';
    }
    return 'incomplete';
  };

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStep(prev => prev + 1);
    } else {
      onOpenChange(false);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{step.title}</DialogTitle>
              <DialogDescription className="text-sm">{step.subtitle}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-1 mb-4">
          {WALKTHROUGH_STEPS.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                index <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <div className="space-y-6">
          <p className="text-muted-foreground">{step.description}</p>

          {/* Welcome step highlights */}
          {'highlights' in step && step.highlights && (
            <div className="grid grid-cols-2 gap-3">
              {step.highlights.map((highlight, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          )}

          {/* Requirements list */}
          {'requirements' in step && step.requirements && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3">What you'll need:</h4>
                <div className="space-y-3">
                  {step.requirements.map((req, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{req.label}</p>
                        <p className="text-xs text-muted-foreground">{req.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline for review step */}
          {'timeline' in step && step.timeline && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  {step.timeline.map((item, index) => (
                    <div key={index} className="flex flex-col items-center gap-2 flex-1">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        item.status === 'complete' && "bg-success text-success-foreground",
                        item.status === 'active' && "bg-primary text-primary-foreground",
                        item.status === 'pending' && "bg-muted text-muted-foreground"
                      )}>
                        {item.status === 'complete' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-medium">{index + 1}</span>
                        )}
                      </div>
                      <span className="text-xs text-center">{item.label}</span>
                      {index < step.timeline.length - 1 && (
                        <div className="absolute h-0.5 bg-muted" style={{ width: '30%', left: `${(index + 0.5) * 33}%` }} />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benefits for final step */}
          {'benefits' in step && step.benefits && (
            <div className="grid gap-4">
              {step.benefits.map((benefit, index) => {
                const BenefitIcon = benefit.icon;
                return (
                  <Card key={index}>
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BenefitIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{benefit.label}</p>
                        <p className="text-sm text-muted-foreground">{benefit.detail}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Tip box */}
          {'tip' in step && step.tip && (
            <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">!</span>
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Tip</p>
                <p className="text-sm text-muted-foreground">{step.tip}</p>
              </div>
            </div>
          )}

          {/* Current verification status */}
          {(step.id === 'id-verification' || step.id === 'selfie') && idVerificationStatus && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Your status:</span>
              <Badge 
                variant={idVerificationStatus === 'approved' ? 'default' : idVerificationStatus === 'pending' ? 'secondary' : 'destructive'}
                className={idVerificationStatus === 'approved' ? 'bg-success' : ''}
              >
                {idVerificationStatus === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                {idVerificationStatus === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                {idVerificationStatus.charAt(0).toUpperCase() + idVerificationStatus.slice(1)}
              </Badge>
            </div>
          )}

          {step.id === 'banking' && bankingStatus && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Your status:</span>
              <Badge 
                variant={bankingStatus === 'verified' ? 'default' : bankingStatus === 'pending' ? 'secondary' : 'destructive'}
                className={bankingStatus === 'verified' ? 'bg-success' : ''}
              >
                {bankingStatus === 'verified' && <CheckCircle className="h-3 w-3 mr-1" />}
                {bankingStatus === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                {bankingStatus.charAt(0).toUpperCase() + bankingStatus.slice(1)}
              </Badge>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={isFirstStep}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button onClick={handleNext} className="gap-2">
            {isLastStep ? 'Get Started' : 'Next'}
            {!isLastStep && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
