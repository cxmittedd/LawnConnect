import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, CreditCard, Edit, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, format, setDate, isBefore, startOfDay } from 'date-fns';

const JAMAICA_PARISHES = [
  'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann',
  'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth',
  'Manchester', 'Clarendon', 'St. Catherine',
] as const;

const JOB_TYPES = [
  'Basic Grass Cutting',
  'Basic Grass Cutting (overgrown grass)',
  'Cut + Tree Trimming',
] as const;

const LAWN_SIZES = [
  { value: 'small', label: 'Small (Up to 1/8 acre)' },
  { value: 'medium', label: 'Medium (1/8 - 1/4 acre)' },
  { value: 'large', label: 'Large (1/4 - 1/2 acre)' },
  { value: 'xlarge', label: 'Extra Large (1/2 - 1 acre)' },
] as const;

interface AutopaySetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardLastFour: string;
  cardName: string;
  jobDetails: {
    location: string;
    parish: string;
    lawn_size: string;
    job_type: string;
    additional_requirements: string;
  };
  onConfirm: (settings: {
    recurring_day: number;
    location: string;
    parish: string;
    lawn_size: string;
    job_type: string;
    additional_requirements: string;
  }) => Promise<void>;
}

export function AutopaySetupDialog({
  open,
  onOpenChange,
  cardLastFour,
  cardName,
  jobDetails,
  onConfirm,
}: AutopaySetupDialogProps) {
  const [recurringDay, setRecurringDay] = useState<number>(15);
  const [editMode, setEditMode] = useState(false);
  const [editedDetails, setEditedDetails] = useState(jobDetails);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditedDetails(jobDetails);
  }, [jobDetails]);

  const getNextScheduledDate = (day: number) => {
    const today = startOfDay(new Date());
    let targetDate = setDate(today, day);
    
    // If the day has passed this month, move to next month
    if (isBefore(targetDate, today) || targetDate.getTime() === today.getTime()) {
      targetDate = setDate(addDays(targetDate, 32), day);
    }
    
    // Job will be posted 2 days before
    const postDate = addDays(targetDate, -2);
    return { cutDate: targetDate, postDate };
  };

  const { cutDate, postDate } = getNextScheduledDate(recurringDay);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm({
        recurring_day: recurringDay,
        ...editedDetails,
      });
      toast.success('Autopay has been set up successfully!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to set up autopay');
    } finally {
      setSaving(false);
    }
  };

  const getLawnSizeLabel = (value: string) => {
    return LAWN_SIZES.find(s => s.value === value)?.label || value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Set Up Autopay
          </DialogTitle>
          <DialogDescription>
            Automatically post your lawn cutting job on a recurring schedule. Your job will be posted 2 days before your selected cut date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Card Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{cardName}</p>
                <p className="text-sm text-muted-foreground">Card ending in {cardLastFour}</p>
              </div>
            </div>
          </div>

          {/* Recurring Day Selection */}
          <div className="space-y-2">
            <Label>Select your preferred lawn cut day (1-28)</Label>
            <Select
              value={recurringDay.toString()}
              onValueChange={(v) => setRecurringDay(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Next cut: <span className="font-medium">{format(cutDate, 'MMMM d, yyyy')}</span>
              <br />
              Job will be posted: <span className="font-medium">{format(postDate, 'MMMM d, yyyy')}</span>
            </p>
          </div>

          {/* Job Details Preview/Edit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Job Details</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Done
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </>
                )}
              </Button>
            </div>

            {editMode ? (
              <div className="space-y-4 border rounded-lg p-4">
                <div className="space-y-2">
                  <Label>Job Type</Label>
                  <Select
                    value={editedDetails.job_type}
                    onValueChange={(v) => setEditedDetails({ ...editedDetails, job_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Parish</Label>
                    <Select
                      value={editedDetails.parish}
                      onValueChange={(v) => setEditedDetails({ ...editedDetails, parish: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JAMAICA_PARISHES.map((parish) => (
                          <SelectItem key={parish} value={parish}>{parish}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Lawn Size</Label>
                    <Select
                      value={editedDetails.lawn_size}
                      onValueChange={(v) => setEditedDetails({ ...editedDetails, lawn_size: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LAWN_SIZES.map((size) => (
                          <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={editedDetails.location}
                    onChange={(e) => setEditedDetails({ ...editedDetails, location: e.target.value })}
                    placeholder="Street address"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Additional Requirements</Label>
                  <Textarea
                    value={editedDetails.additional_requirements}
                    onChange={(e) => setEditedDetails({ ...editedDetails, additional_requirements: e.target.value })}
                    placeholder="Any extra work needed?"
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Job Type:</span>
                  <span className="font-medium">{editedDetails.job_type || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parish:</span>
                  <span className="font-medium">{editedDetails.parish || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">{editedDetails.location || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lawn Size:</span>
                  <span className="font-medium">{getLawnSizeLabel(editedDetails.lawn_size) || 'Not set'}</span>
                </div>
                {editedDetails.additional_requirements && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground">Additional:</span>
                    <p className="mt-1">{editedDetails.additional_requirements}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !editedDetails.location || !editedDetails.parish}>
            <Check className="h-4 w-4 mr-1" />
            {saving ? 'Setting up...' : 'Confirm Autopay'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
