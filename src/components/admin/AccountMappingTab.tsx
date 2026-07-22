import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, Check, AlertCircle, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePPCSellerNames } from '@/hooks/usePPCSellerNames';
import { toast } from 'sonner';

interface AccountMapping {
  id: string;
  account_name: string;
  merchant_token: string;
  ppc_sellername: string | null;
}

export function AccountMappingTab() {
  const [accounts, setAccounts] = useState<AccountMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const { sellerNames, isLoading: loadingSellerNames, refetch: refetchSellerNames } = usePPCSellerNames();

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts_master')
        .select('id, account_name, merchant_token, ppc_sellername')
        .order('account_name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      toast.error('Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleMappingChange = async (accountId: string, ppcSellername: string | null) => {
    setSavingId(accountId);
    try {
      const { error } = await supabase
        .from('accounts_master')
        .update({ ppc_sellername: ppcSellername === '__NONE__' ? null : ppcSellername })
        .eq('id', accountId);

      if (error) throw error;

      // Update local state
      setAccounts(prev => 
        prev.map(acc => 
          acc.id === accountId 
            ? { ...acc, ppc_sellername: ppcSellername === '__NONE__' ? null : ppcSellername }
            : acc
        )
      );

      toast.success('Mapping saved');
    } catch (err) {
      console.error('Error saving mapping:', err);
      toast.error('Failed to save mapping');
    } finally {
      setSavingId(null);
    }
  };

  // Get seller names that are not linked to any account
  const linkedSellerNames = new Set(accounts.map(a => a.ppc_sellername).filter(Boolean));
  const unlinkedSellerNames = sellerNames.filter(name => !linkedSellerNames.has(name));

  // Count linked accounts
  const linkedCount = accounts.filter(a => a.ppc_sellername).length;

  const handleRefresh = () => {
    fetchAccounts();
    refetchSellerNames();
  };

  if (isLoading || loadingSellerNames) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading account mappings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                PPC Account Mapping
              </CardTitle>
              <CardDescription>
                Link dashboard accounts to their corresponding PPC seller names in search term reports.
                This ensures PPC analytics data appears correctly for each client.
              </CardDescription>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Badge variant="outline" className="bg-green-50">
              <Check className="h-3 w-3 mr-1" />
              {linkedCount} Linked
            </Badge>
            <Badge variant="outline" className="bg-yellow-50">
              <AlertCircle className="h-3 w-3 mr-1" />
              {accounts.length - linkedCount} Unlinked
            </Badge>
            <Badge variant="secondary">
              {sellerNames.length} PPC Sellers Available
            </Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dashboard Account</TableHead>
                <TableHead>Merchant Token</TableHead>
                <TableHead>PPC Seller Name</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.account_name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {account.merchant_token}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={account.ppc_sellername || '__NONE__'}
                      onValueChange={(value) => handleMappingChange(account.id, value)}
                      disabled={savingId === account.id}
                    >
                      <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Select PPC seller name..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__NONE__">
                          <span className="text-muted-foreground">-- Not Linked --</span>
                        </SelectItem>
                        {sellerNames.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                            {linkedSellerNames.has(name) && name !== account.ppc_sellername && (
                              <span className="text-muted-foreground ml-2">(in use)</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {savingId === account.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : account.ppc_sellername ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        <Check className="h-3 w-3 mr-1" />
                        Linked
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Unlinked
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {unlinkedSellerNames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unlinked PPC Sellers</CardTitle>
            <CardDescription>
              These PPC seller names exist in search term reports but are not linked to any dashboard account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unlinkedSellerNames.map((name) => (
                <Badge key={name} variant="secondary">
                  {name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
