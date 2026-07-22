import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Loader2 } from 'lucide-react';

export const TestEmailButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendTestEmail = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Sending test emails...');
      
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: { test: true }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Test email response:', data);

      toast({
        title: "Test Emails Sent! ✅",
        description: `Test emails have been sent to hello@martincase.co.uk and gemma@martincase.co.uk. Check your inbox!`,
      });

    } catch (error: any) {
      console.error('❌ Error sending test emails:', error);
      toast({
        title: "Failed to Send Test Emails",
        description: error.message || "An error occurred while sending test emails",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={sendTestEmail} 
      disabled={isLoading}
      variant="outline"
      size="sm"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Mail className="h-4 w-4 mr-2" />
      )}
      {isLoading ? 'Sending...' : 'Send Test Email'}
    </Button>
  );
};