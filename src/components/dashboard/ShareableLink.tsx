import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { generateShareCode, generateShareUrl } from '@/utils/shareUtils';
import type { AccountData } from '@/types/dashboard';

interface ShareableLinkProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountData;
  sheetData: any[];
  ppcData: any[];
  asinData?: any[];
  onUpdateAccount: (account: AccountData) => void;
}

export const ShareableLink = ({ 
  isOpen, 
  onClose, 
  account, 
  sheetData, 
  ppcData, 
  asinData = [], 
  onUpdateAccount 
}: ShareableLinkProps) => {
  const [shareUrl, setShareUrl] = useState<string>('');

  const generateShareLink = () => {
    // Ensure account has a share code
    let updatedAccount = { ...account };
    if (!updatedAccount.shareCode) {
      updatedAccount.shareCode = generateShareCode();
      console.log('📝 Generated new shareCode:', updatedAccount.shareCode);
      onUpdateAccount(updatedAccount);
      
      // Notify user to add to Google Sheet
      toast.success(`Share link generated! Share code: ${updatedAccount.shareCode}`, {
        description: 'Remember to add this code to your Accounts Master sheet (column E) for persistent access.',
        duration: 8000,
      });
    } else {
      toast.success('Share link generated!');
    }

    const payload = {
      account: updatedAccount,
      sheetData,
      ppcData,
      asinData
    };
    
    const { shortUrl, fullUrl } = generateShareUrl(
      updatedAccount.name, 
      updatedAccount.shareCode, 
      payload
    );
    
    setShareUrl(shortUrl);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const openInNewTab = () => {
    window.open(shareUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Dashboard</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate a shareable link for {account.name}'s dashboard
          </p>
          
          {!shareUrl ? (
            <Button onClick={generateShareLink} className="w-full">
              Generate Share Link
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex space-x-2">
                <Input value={shareUrl} readOnly className="flex-1" />
                <Button size="icon" variant="outline" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={openInNewTab}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={generateShareLink} variant="outline" size="sm">
                Generate New Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};