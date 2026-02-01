import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface SensitiveDataFieldProps {
  label: string;
  value: string;
  maskedValue: string;
  onReveal?: () => void;
  className?: string;
  showCopy?: boolean;
}

/**
 * A component that displays sensitive data with mask/reveal toggle.
 * Logs reveal actions for security auditing.
 */
export function SensitiveDataField({
  label,
  value,
  maskedValue,
  onReveal,
  className = '',
  showCopy = true,
}: SensitiveDataFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  const handleReveal = () => {
    if (!isRevealed && onReveal) {
      onReveal();
    }
    setIsRevealed(!isRevealed);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard`);
  };

  const displayValue = isRevealed ? value : maskedValue;

  return (
    <div className={`flex items-center justify-between p-3 bg-muted rounded-lg ${className}`}>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono font-semibold truncate">{displayValue}</p>
      </div>
      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReveal}
          title={isRevealed ? 'Hide' : 'Reveal'}
        >
          {isRevealed ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
        {showCopy && isRevealed && (
          <Button
            size="sm"
            variant="ghost"
            onClick={copyToClipboard}
            title="Copy to clipboard"
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
