import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { AccountData } from '@/types/dashboard';

interface EmailConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountData;
  onSave: (accountData: AccountData) => void;
}

export const EmailConfigDialog = ({ isOpen, onClose, account, onSave }: EmailConfigDialogProps) => {
  const [emailConfig, setEmailConfig] = useState({
    clientEmail: account.emailConfig?.clientEmail || '',
    frequency: account.emailConfig?.frequency || 'weekly' as const,
    enabled: account.emailConfig?.enabled || false,
  });
  const { toast } = useToast();

  const handleSave = () => {
    if (emailConfig.enabled && !emailConfig.clientEmail) {
      toast({
        title: "Email Required",
        description: "Please enter a client email address to enable email reports.",
        variant: "destructive",
      });
      return;
    }

    const updatedAccount: AccountData = {
      ...account,
      emailConfig: {
        ...emailConfig,
        lastSent: account.emailConfig?.lastSent,
      }
    };

    onSave(updatedAccount);
    onClose();
    
    toast({
      title: "Email Configuration Saved",
      description: `Email reports ${emailConfig.enabled ? 'enabled' : 'disabled'} for ${account.name}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Email Configuration - {account.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={emailConfig.enabled}
              onCheckedChange={(enabled) => setEmailConfig(prev => ({ ...prev, enabled }))}
            />
            <Label htmlFor="enabled">Enable automated email reports</Label>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="clientEmail" className="text-right">
              Client Email
            </Label>
            <Input
              id="clientEmail"
              value={emailConfig.clientEmail}
              onChange={(e) => setEmailConfig(prev => ({ ...prev, clientEmail: e.target.value }))}
              placeholder="client@example.com"
              className="col-span-3"
              disabled={!emailConfig.enabled}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="frequency" className="text-right">
              Frequency
            </Label>
            <Select
              value={emailConfig.frequency}
              onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                setEmailConfig(prev => ({ ...prev, frequency: value }))
              }
              disabled={!emailConfig.enabled}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {account.emailConfig?.lastSent && (
            <div className="text-sm text-muted-foreground">
              Last email sent: {new Date(account.emailConfig.lastSent).toLocaleDateString()}
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};