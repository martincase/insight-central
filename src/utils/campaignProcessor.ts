import type { CampaignData, AccountData, DateFilter } from '@/types/dashboard';
import { getCurrentDateRange } from './dataProcessor';

export const processCampaignData = (
  campaignRows: any[][],
  accounts: AccountData[],
  dateFilter: DateFilter,
  customDateRange?: { from: Date; to: Date }
): CampaignData[] => {
  if (!campaignRows || campaignRows.length < 2) return [];

  const headers = campaignRows[0];
  const campaignNameIndex = headers.findIndex((header: string) => 
    header.toLowerCase().includes('sponsored_products_campaign__campaign')
  );
  const accountNameIndex = headers.findIndex((header: string) => 
    header.toLowerCase().includes('account_name')
  );
  const spendIndex = headers.findIndex((header: string) => 
    header.toLowerCase().includes('sponsored_products_campaign__cost')
  );
  const salesIndex = headers.findIndex((header: string) => 
    header.toLowerCase().includes('sponsored_products_campaign__attributedsales14d')
  );
  const dateIndex = headers.findIndex((header: string) => 
    header.toLowerCase().includes('date')
  );

  console.log('Campaign data headers:', headers);
  console.log('Column indices:', { campaignNameIndex, accountNameIndex, spendIndex, salesIndex, dateIndex });

  if (campaignNameIndex === -1 || accountNameIndex === -1 || spendIndex === -1 || salesIndex === -1) {
    console.warn('Missing required campaign columns');
    return [];
  }

  const dateRange = getCurrentDateRange(dateFilter, customDateRange);
  const { from: startDate, to: endDate } = dateRange;

  console.log('Processing campaign data with date range:', startDate, 'to', endDate);
  console.log('Available accounts:', accounts.map(acc => ({ name: acc.name, ppcAccountName: acc.ppcAccountName })));

  // Group campaigns by account and campaign name
  const campaignMap = new Map<string, {
    accountName: string;
    campaignName: string;
    totalSpend: number;
    totalSales: number;
  }>();

  for (let i = 1; i < campaignRows.length; i++) {
    const row = campaignRows[i];
    const campaignName = row[campaignNameIndex]?.toString().trim();
    const accountName = row[accountNameIndex]?.toString().trim();
    const spend = parseFloat(row[spendIndex]) || 0;
    const sales = parseFloat(row[salesIndex]) || 0;
    const rowDateStr = row[dateIndex]?.toString();

    console.log(`Processing row ${i}:`, { campaignName, accountName, spend, sales, rowDateStr });

    if (!campaignName || !accountName) {
      console.log('Skipping row - missing campaign name or account name');
      continue;
    }

    // Filter by date if date column exists and it's not a recent date
    if (dateIndex !== -1 && rowDateStr) {
      try {
        // Try multiple date formats
        let rowDate;
        if (rowDateStr.includes('/')) {
          // Try DD/MM/YYYY first, then MM/DD/YYYY
          const parts = rowDateStr.split('/');
          if (parts.length === 3) {
            // Try DD/MM/YYYY format
            rowDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            if (isNaN(rowDate.getTime())) {
              // Try MM/DD/YYYY format
              rowDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
            }
          }
        } else {
          rowDate = new Date(rowDateStr);
        }
        
        if (!isNaN(rowDate.getTime()) && (rowDate < startDate || rowDate > endDate)) {
          console.log('Skipping row - outside date range. Row date:', rowDate, 'Range:', startDate, 'to', endDate);
          continue;
        }
      } catch (error) {
        console.log('Error parsing date:', rowDateStr, error);
        // Continue processing if date parsing fails
      }
    }

    // Match account by merchant token or PPC Account Name
    console.log('Checking account match for:', accountName);
    const matchedAccount = accounts.find(acc => {
      // First try to match by PPC account name
      if (acc.ppcAccountName?.toLowerCase() === accountName.toLowerCase()) {
        return true;
      }
      // Then try to match by merchant token (accountName contains the token)
      if (acc.merchantToken && accountName.includes(acc.merchantToken)) {
        return true;
      }
      return false;
    });

    console.log('Matched account for', accountName, ':', matchedAccount?.name);
    
    // Use the matched account's display name, or fall back to the account name from data
    const displayAccountName = matchedAccount ? matchedAccount.name : accountName;

    console.log('Adding campaign to map:', campaignName, 'for account:', displayAccountName);

    const key = `${displayAccountName}-${campaignName}`;
    const existing = campaignMap.get(key);

    if (existing) {
      existing.totalSpend += spend;
      existing.totalSales += sales;
      console.log('Updated existing campaign:', key);
    } else {
      campaignMap.set(key, {
        accountName: displayAccountName, // Use proper account display name
        campaignName,
        totalSpend: spend,
        totalSales: sales,
      });
      console.log('Added new campaign:', key);
    }
  }

  console.log('Final campaign map size:', campaignMap.size);
  console.log('Campaign map entries:', Array.from(campaignMap.entries()).slice(0, 3));

  // Convert to CampaignData with alerts
  const campaigns: CampaignData[] = [];
  campaignMap.forEach((data, key) => {
    const acos = data.totalSales > 0 ? (data.totalSpend / data.totalSales) * 100 : 0;
    const { alertType, alertMessage } = generateCampaignAlert(data.totalSpend, data.totalSales, acos);

    campaigns.push({
      id: key,
      accountName: data.accountName,
      campaignName: data.campaignName,
      spend: data.totalSpend,
      sales: data.totalSales,
      acos,
      alertType,
      alertMessage,
    });
  });

  // Sort by spend descending
  return campaigns.sort((a, b) => b.spend - a.spend);
};

const generateCampaignAlert = (spend: number, sales: number, acos: number): {
  alertType: CampaignData['alertType'];
  alertMessage: string;
} => {
  // No spend, no sales
  if (spend === 0 && sales === 0) {
    return { alertType: 'neutral', alertMessage: 'No activity' };
  }

  // High spend but no sales
  if (spend > 100 && sales === 0) {
    return { alertType: 'danger', alertMessage: 'High spend with no sales' };
  }

  // No sales but some spend
  if (sales === 0 && spend > 0) {
    return { alertType: 'warning', alertMessage: 'Spend with no sales' };
  }

  // ACOS thresholds
  if (acos > 100) {
    return { alertType: 'danger', alertMessage: `Very high ACOS (${acos.toFixed(1)}%)` };
  }

  if (acos > 50) {
    return { alertType: 'warning', alertMessage: `High ACOS (${acos.toFixed(1)}%)` };
  }

  if (acos < 20) {
    return { alertType: 'excellent', alertMessage: `Excellent ACOS (${acos.toFixed(1)}%)` };
  }

  if (acos < 35) {
    return { alertType: 'good', alertMessage: `Good ACOS (${acos.toFixed(1)}%)` };
  }

  return { alertType: 'neutral', alertMessage: `ACOS: ${acos.toFixed(1)}%` };
};