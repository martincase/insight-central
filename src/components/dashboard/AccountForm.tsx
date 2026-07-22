
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AccountData } from '@/types/dashboard';
import { getAmazonSellerCentralUrl, getAmazonVendorCentralUrl } from '@/utils/amazonUtils';

interface AccountFormProps {
  account?: AccountData;
  onSubmit: (account: AccountData) => void;
}

export const AccountForm = ({ account, onSubmit }: AccountFormProps) => {
  const [formData, setFormData] = useState({
    name: account?.name || '',
    sellerCentralLink: account?.sellerCentralLink || '',
    merchantToken: account?.merchantToken || '',
    ppcAccountName: account?.ppcAccountName || '',
    type: account?.type || 'seller' as const,
  });

  const [targets, setTargets] = useState({
    sales: account?.targets?.sales || '',
    ppcSpend: account?.targets?.ppcSpend || '',
    ppcSales: account?.targets?.ppcSales || '',
    acos: account?.targets?.acos || '',
    tacos: account?.targets?.tacos || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedAccount: AccountData = {
      id: account?.id || '',
      name: formData.name,
      sales: account?.sales || 0,
      ppcSpend: account?.ppcSpend || 0,
      ppcSales: account?.ppcSales || 0,
      acos: account?.acos || 0,
      tacos: account?.tacos || 0,
      unitsOrdered: account?.unitsOrdered || 0,
      pageViews: account?.pageViews || 0,
      impressions: account?.impressions || 0,
      clicks: account?.clicks || 0,
      cpc: account?.cpc || 0,
      ctr: account?.ctr || 0,
      buyBoxPercentage: account?.buyBoxPercentage || 0,
      conversionRate: account?.conversionRate || 0,
      sellerCentralLink: formData.sellerCentralLink,
      merchantToken: formData.merchantToken,
      ppcAccountName: formData.ppcAccountName,
      type: formData.type,
      status: account?.status || 'active',
      isStarred: account?.isStarred || false,
      targets: {
        sales: targets.sales ? Number(targets.sales) : undefined,
        ppcSpend: targets.ppcSpend ? Number(targets.ppcSpend) : undefined,
        ppcSales: targets.ppcSales ? Number(targets.ppcSales) : undefined,
        acos: targets.acos ? Number(targets.acos) : undefined,
        tacos: targets.tacos ? Number(targets.tacos) : undefined,
      },
      previousPeriod: account?.previousPeriod,
    };
    
    onSubmit(updatedAccount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Account Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter account name"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="merchantToken">Merchant Token</Label>
          <Input
            id="merchantToken"
            value={formData.merchantToken}
            onChange={(e) => setFormData({ ...formData, merchantToken: e.target.value })}
            placeholder="Enter merchant token"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="ppcAccountName">PPC Account Name</Label>
          <Input
            id="ppcAccountName"
            value={formData.ppcAccountName}
            onChange={(e) => setFormData({ ...formData, ppcAccountName: e.target.value })}
            placeholder="e.g. 3576382270897012 - UK"
          />
          <p className="text-sm text-gray-600 mt-1">
            Enter the exact account name from the PPC sheet to link PPC data
          </p>
        </div>
        
        <div>
          <Label htmlFor="type">Account Type</Label>
          <Select value={formData.type} onValueChange={(value: 'seller' | 'vendor') => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seller">Seller</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="sellerCentralLink">{formData.type === 'seller' ? 'Seller Central Link' : 'Vendor Central Link'}</Label>
          <Input
            id="sellerCentralLink"
            value={formData.sellerCentralLink}
            onChange={(e) => setFormData({ ...formData, sellerCentralLink: e.target.value })}
            placeholder={formData.type === 'seller' 
              ? getAmazonSellerCentralUrl(formData.merchantToken) 
              : getAmazonVendorCentralUrl(formData.merchantToken)
            }
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Performance Targets (Optional)</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="targetSales">Target Sales (£)</Label>
            <Input
              id="targetSales"
              type="number"
              value={targets.sales}
              onChange={(e) => setTargets({ ...targets, sales: e.target.value })}
              placeholder="e.g. 10000"
            />
          </div>
          
          <div>
            <Label htmlFor="targetPpcSales">Target PPC Sales (£)</Label>
            <Input
              id="targetPpcSales"
              type="number"
              value={targets.ppcSales}
              onChange={(e) => setTargets({ ...targets, ppcSales: e.target.value })}
              placeholder="e.g. 3000"
            />
          </div>
          
          <div>
            <Label htmlFor="targetPpcSpend">Max PPC Spend (£)</Label>
            <Input
              id="targetPpcSpend"
              type="number"
              value={targets.ppcSpend}
              onChange={(e) => setTargets({ ...targets, ppcSpend: e.target.value })}
              placeholder="e.g. 1000"
            />
          </div>
          
          <div>
            <Label htmlFor="targetAcos">Max ACOS (%)</Label>
            <Input
              id="targetAcos"
              type="number"
              step="0.1"
              value={targets.acos}
              onChange={(e) => setTargets({ ...targets, acos: e.target.value })}
              placeholder="e.g. 30"
            />
          </div>
          
          <div>
            <Label htmlFor="targetTacos">Max TACOS (%)</Label>
            <Input
              id="targetTacos"
              type="number"
              step="0.1"
              value={targets.tacos}
              onChange={(e) => setTargets({ ...targets, tacos: e.target.value })}
              placeholder="e.g. 10"
            />
          </div>
        </div>
        
        <p className="text-sm text-gray-600">
          Set targets to receive notifications when performance is above or below your goals.
        </p>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {account ? 'Update Account' : 'Add Account'}
        </Button>
      </div>
    </form>
  );
};
