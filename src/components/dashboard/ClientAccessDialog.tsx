import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Copy, RefreshCw, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateAndSaveClientToken, generateClientURL } from '@/utils/clientAccessUtils';
import { saveEmailConfig } from '@/utils/clientTokenManager';
import type { AccountData } from '@/types/dashboard';

interface ClientAccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountData;
  onSave: (accountData: AccountData) => void;
}

export const ClientAccessDialog = ({ isOpen, onClose, account, onSave }: ClientAccessDialogProps) => {
  const [hasClientAccess, setHasClientAccess] = useState(!!account.clientAccessToken);
  const [clientURL, setClientURL] = useState(
    account.clientAccessToken ? generateClientURL(account.merchantToken, account.clientAccessToken) : ''
  );
  const { toast } = useToast();

  const generateNewToken = () => {
    // Use merchant token as the account ID for consistency
    const newToken = generateAndSaveClientToken(account.merchantToken, account.merchantToken);
    const newURL = generateClientURL(account.merchantToken, newToken);
    setClientURL(newURL);
    
    const updatedAccount: AccountData = {
      ...account,
      clientAccessToken: newToken
    };
    
    onSave(updatedAccount);
    
    toast({
      title: "New Client URL Generated",
      description: "A new secure client access URL has been created.",
    });
  };

  const toggleClientAccess = (enabled: boolean) => {
    setHasClientAccess(enabled);
    
    if (enabled && !account.clientAccessToken) {
      generateNewToken();
    } else if (!enabled) {
      setClientURL('');
      // Note: We don't actually remove the token from storage, just disable access UI
      const updatedAccount: AccountData = {
        ...account,
        clientAccessToken: undefined
      };
      onSave(updatedAccount);
      
      toast({
        title: "Client Access Disabled",
        description: "Client access URL has been revoked for this account.",
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(clientURL).then(() => {
      toast({
        title: "URL Copied",
        description: "Client access URL copied to clipboard.",
      });
    }).catch(() => {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = clientURL;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "URL Copied",
        description: "Client access URL copied to clipboard.",
      });
    });
  };

  const openInNewTab = () => {
    window.open(clientURL, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Client Access - {account.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="clientAccess"
              checked={hasClientAccess}
              onCheckedChange={toggleClientAccess}
            />
            <Label htmlFor="clientAccess">Enable client-only dashboard access</Label>
          </div>
          
          {hasClientAccess && clientURL && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="clientURL" className="text-sm font-medium">
                  Client Access URL
                </Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Input
                    id="clientURL"
                    value={clientURL}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="icon"
                    title="Copy URL"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={openInNewTab}
                    variant="outline"
                    size="icon"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Client Access Features:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Secure, unique URL for this account only</li>
                  <li>• Read-only access to performance metrics</li>
                  <li>• No access to other client data</li>
                  <li>• Real-time data updates</li>
                  <li>• Professional branded interface</li>
                </ul>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  onClick={generateNewToken}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate New URL
                </Button>
                <span className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
          
          {!hasClientAccess && (
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-gray-600">
                Enable client access to generate a secure, personalized dashboard URL for this account.
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};