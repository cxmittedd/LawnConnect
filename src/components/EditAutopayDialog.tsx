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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, Edit, Check, X, MapPin, Save } from 'lucide-react';
import { toast } from 'sonner';
import { AutopaySettings } from '@/hooks/useCustomerPreferences';

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

interface EditAutopayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AutopaySettings;
  onSave: (settings: AutopaySettings) => Promise<void>;
}

export function EditAutopayDialog({
  open,
  onOpenChange,
  settings,
  onSave,
}: EditAutopayDialogProps) {
  const [frequency, setFrequency] = useState<'monthly' | 'bimonthly'>(settings.frequency);
  const [recurringDay, setRecurringDay] = useState(settings.recurring_day);
  const [recurringDay2, setRecurringDay2] = useState(settings.recurring_day_2 || 28);
  const [locationName, setLocationName] = useState(settings.location_name || '');
  const [location, setLocation] = useState(settings.location || '');
  const [parish, setParish] = useState(settings.parish || '');
  const [lawnSize, setLawnSize] = useState(settings.lawn_size || 'small');
  const [jobType, setJobType] = useState(settings.job_type || 'Basic Grass Cutting');
  const [additionalRequirements, setAdditionalRequirements] = useState(settings.additional_requirements || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFrequency(settings.frequency);
    setRecurringDay(settings.recurring_day);
    setRecurringDay2(settings.recurring_day_2 || 28);
    setLocationName(settings.location_name || '');
    setLocation(settings.location || '');
    setParish(settings.parish || '');
    setLawnSize(settings.lawn_size || 'small');
    setJobType(settings.job_type || 'Basic Grass Cutting');
    setAdditionalRequirements(settings.additional_requirements || '');
  }, [settings]);

  const getDaySuffix = (day: number) => {
    if (day === 1 || day === 21) return 'st';
    if (day === 2 || day === 22) return 'nd';
    if (day === 3 || day === 23) return 'rd';
    return 'th';
  };

  const handleSave = async () => {
    if (!locationName.trim() || !location.trim() || !parish) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...settings,
        frequency,
        recurring_day: recurringDay,
        recurring_day_2: frequency === 'bimonthly' ? recurringDay2 : null,
        location_name: locationName,
        location,
        parish,
        lawn_size: lawnSize,
        job_type: jobType,
        additional_requirements: additionalRequirements,
      });
      toast.success('Autopay settings updated');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Edit Autopay Settings
          </DialogTitle>
          <DialogDescription>
            Update your recurring lawn care schedule for {settings.location_name || 'this location'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Location Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location Name *
            </Label>
            <Input
              placeholder="e.g., Home, Office, Mom's House"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>

          {/* Frequency Selection */}
          <div className="space-y-3">
            <Label>Frequency</Label>
            <RadioGroup value={frequency} onValueChange={(v) => setFrequency(v as 'monthly' | 'bimonthly')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="edit-monthly" />
                <Label htmlFor="edit-monthly" className="font-normal cursor-pointer">Once a month</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bimonthly" id="edit-bimonthly" />
                <Label htmlFor="edit-bimonthly" className="font-normal cursor-pointer">Twice a month</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Recurring Day Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{frequency === 'bimonthly' ? 'First cut day' : 'Cut day'}</Label>
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
                      {day}{getDaySuffix(day)} of each month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {frequency === 'bimonthly' && (
              <div className="space-y-2">
                <Label>Second cut day</Label>
                <Select
                  value={recurringDay2.toString()}
                  onValueChange={(v) => setRecurringDay2(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}{getDaySuffix(day)} of each month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Job Details */}
          <div className="space-y-4 border-t pt-4">
            <Label className="text-base">Job Details</Label>
            
            <div className="space-y-2">
              <Label>Job Type</Label>
              <Select value={jobType} onValueChange={setJobType}>
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
                <Label>Parish *</Label>
                <Select value={parish} onValueChange={setParish}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {JAMAICA_PARISHES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lawn Size</Label>
                <Select value={lawnSize} onValueChange={setLawnSize}>
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
              <Label>Location/Address *</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Street address"
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Requirements</Label>
              <Textarea
                value={additionalRequirements}
                onChange={(e) => setAdditionalRequirements(e.target.value)}
                placeholder="Any extra work needed?"
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
