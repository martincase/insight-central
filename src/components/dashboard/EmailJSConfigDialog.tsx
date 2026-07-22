import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

interface EmailJSConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: EmailJSConfig) => void;
}

const STORAGE_KEY = 'emailjs_config';

export const EmailJSConfigDialog = ({ isOpen, onClose, onSave }: EmailJSConfigDialogProps) => {
  const [config, setConfig] = useState<EmailJSConfig>({
    serviceId: '',
    templateId: '',
    publicKey: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    // Load existing config from localStorage
    const savedConfig = localStorage.getItem(STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
      } catch (error) {
        console.error('Error loading EmailJS config:', error);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!config.serviceId || !config.templateId || !config.publicKey) {
      toast({
        title: "All Fields Required",
        description: "Please fill in all EmailJS configuration fields.",
        variant: "destructive",
      });
      return;
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    
    onSave(config);
    onClose();
    
    toast({
      title: "EmailJS Configuration Saved",
      description: "Email service is now configured and ready to use.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure EmailJS Service</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="text-sm text-muted-foreground mb-4">
            To enable automated email reports, you need to configure EmailJS. 
            Visit <a href="https://emailjs.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">emailjs.com</a> to create an account and get your credentials.
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="serviceId" className="text-right">
              Service ID
            </Label>
            <Input
              id="serviceId"
              value={config.serviceId}
              onChange={(e) => setConfig(prev => ({ ...prev, serviceId: e.target.value }))}
              placeholder="service_xxxxxxx"
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="templateId" className="text-right">
              Template ID
            </Label>
            <Input
              id="templateId"
              value={config.templateId}
              onChange={(e) => setConfig(prev => ({ ...prev, templateId: e.target.value }))}
              placeholder="template_xxxxxxx"
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="publicKey" className="text-right">
              Public Key
            </Label>
            <Input
              id="publicKey"
              value={config.publicKey}
              onChange={(e) => setConfig(prev => ({ ...prev, publicKey: e.target.value }))}
              placeholder="Your public key"
              className="col-span-3"
            />
          </div>
          
          <div className="text-xs text-muted-foreground mt-4 p-3 bg-blue-50 rounded">
            <strong>Email Template Variables:</strong><br />
            Use these variables in your EmailJS template: {'{to_email}'}, {'{account_name}'}, {'{sales}'}, {'{ppc_spend}'}, {'{acos}'}, {'{tacos}'}, {'{date}'}, {'{screenshot_data}'}
          </div>
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