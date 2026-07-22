import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Rocket } from 'lucide-react';

interface ResearchLauncherProps {
  accountName: string;
}

const MARKETPLACES = [
  { value: 'uk', label: '🇬🇧 UK' },
  { value: 'us', label: '🇺🇸 US' },
  { value: 'de', label: '🇩🇪 DE' },
  { value: 'fr', label: '🇫🇷 FR' },
  { value: 'it', label: '🇮🇹 IT' },
  { value: 'es', label: '🇪🇸 ES' },
];

export const ResearchLauncher = ({ accountName }: ResearchLauncherProps) => {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [marketplace, setMarketplace] = useState('uk');
  const [productDescription, setProductDescription] = useState('');
  const [targetAsin, setTargetAsin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLaunch = async () => {
    if (!seedKeyword.trim()) {
      toast({ title: 'Seed keyword required', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Insert research session
      const { error: sessionError } = await supabase
        .from('jungle_scout_research_sessions')
        .insert({
          account_name: accountName,
          seed_keyword: seedKeyword.trim(),
          marketplace,
          product_description: productDescription.trim() || null,
          target_asin: targetAsin.trim() || null,
          status: 'pending',
        });

      if (sessionError) throw sessionError;

      // Call share-of-voice edge function
      const { error: fnError } = await supabase.functions.invoke('jungle-scout-share-of-voice', {
        body: {
          keyword: seedKeyword.trim(),
          marketplace,
          account_name: accountName,
        },
      });

      if (fnError) throw fnError;

      toast({ title: 'Research launched', description: `Share of Voice for "${seedKeyword}" queued.` });
      setSeedKeyword('');
      setProductDescription('');
      setTargetAsin('');
    } catch (err: any) {
      toast({ title: 'Error launching research', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="seed-keyword">Seed Keyword *</Label>
          <Input
            id="seed-keyword"
            placeholder="e.g. dog bed"
            value={seedKeyword}
            onChange={(e) => setSeedKeyword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="marketplace">Marketplace</Label>
          <Select value={marketplace} onValueChange={setMarketplace}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MARKETPLACES.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="target-asin">Target ASIN (optional)</Label>
          <Input
            id="target-asin"
            placeholder="B0XXXXXXXXX"
            value={targetAsin}
            onChange={(e) => setTargetAsin(e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="product-desc">Product Description (optional)</Label>
          <Textarea
            id="product-desc"
            placeholder="Brief description of the product..."
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            rows={2}
          />
        </div>
      </div>
      <Button onClick={handleLaunch} disabled={isLoading} className="gap-2">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
        Launch Research
      </Button>
    </div>
  );
};
