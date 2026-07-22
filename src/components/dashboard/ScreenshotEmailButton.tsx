import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Camera, Settings, Wrench, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { captureScreenshot, sendScreenshotEmail, updateLastSentTime, getEmailJSConfig } from '@/utils/screenshotEmailService';
import { EmailConfigDialog } from './EmailConfigDialog';
import { EmailJSConfigDialog } from './EmailJSConfigDialog';
import { ClientAccessDialog } from './ClientAccessDialog';
import type { AccountData } from '@/types/dashboard';

interface ScreenshotEmailButtonProps {
  account: AccountData;
  onUpdateAccount: (account: AccountData) => void;
  targetElementId: string;
}

export const ScreenshotEmailButton = ({ 
  account, 
  onUpdateAccount, 
  targetElementId 
}: ScreenshotEmailButtonProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isEmailJSConfigOpen, setIsEmailJSConfigOpen] = useState(false);
  const [isClientAccessOpen, setIsClientAccessOpen] = useState(false);
  const { toast } = useToast();

  const handleCaptureAndSend = async () => {
    // Check EmailJS configuration first
    if (!getEmailJSConfig()) {
      toast({
        title: "EmailJS Not Configured",
        description: "Please configure EmailJS service first.",
        variant: "destructive",
      });
      setIsEmailJSConfigOpen(true);
      return;
    }

    if (!account.emailConfig?.enabled || !account.emailConfig?.clientEmail) {
      toast({
        title: "Email Not Configured",
        description: "Please configure email settings first.",
        variant: "destructive",
      });
      setIsConfigOpen(true);
      return;
    }

    setIsCapturing(true);
    try {
      const screenshot = await captureScreenshot(targetElementId);
      setIsCapturing(false);
      setIsSending(true);
      
      await sendScreenshotEmail(account, screenshot);
      
      // Update last sent time
      const updatedAccount = {
        ...account,
        emailConfig: {
          ...account.emailConfig,
          lastSent: new Date().toISOString(),
        }
      };
      onUpdateAccount(updatedAccount);
      
      toast({
        title: "Screenshot Email Sent",
        description: `Dashboard screenshot sent to ${account.emailConfig.clientEmail}`,
      });
    } catch (error) {
      toast({
        title: "Failed to Send Email",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
      setIsSending(false);
    }
  };

  const isLoading = isCapturing || isSending;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={handleCaptureAndSend}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          {isCapturing ? (
            <Camera className="h-4 w-4 mr-2 animate-pulse" />
          ) : isSending ? (
            <Mail className="h-4 w-4 mr-2 animate-pulse" />
          ) : (
            <Mail className="h-4 w-4 mr-2" />
          )}
          {isCapturing ? 'Capturing...' : isSending ? 'Sending...' : 'Email Screenshot'}
        </Button>
        
        <Button
          onClick={() => setIsConfigOpen(true)}
          variant="ghost"
          size="sm"
          title="Configure email settings"
        >
          <Settings className="h-4 w-4" />
        </Button>

        <Button
          onClick={() => setIsClientAccessOpen(true)}
          variant="ghost"
          size="sm"
          title="Manage client access URL"
        >
          <Users className="h-4 w-4" />
        </Button>
      </div>

      <EmailConfigDialog
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        account={account}
        onSave={onUpdateAccount}
      />

      <EmailJSConfigDialog
        isOpen={isEmailJSConfigOpen}
        onClose={() => setIsEmailJSConfigOpen(false)}
        onSave={() => {}} // Config is saved internally
      />

      <ClientAccessDialog
        isOpen={isClientAccessOpen}
        onClose={() => setIsClientAccessOpen(false)}
        account={account}
        onSave={onUpdateAccount}
      />
    </>
  );
};