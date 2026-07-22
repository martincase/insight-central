
import type { AccountData } from '@/types/dashboard';

export interface AISuggestion {
  id: string;
  type: 'opportunity' | 'alert' | 'optimization' | 'growth';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  accountId: string;
  accountName: string;
  metric: string;
  currentValue: number;
  targetValue?: number;
  potentialImpact: string;
  actionItems: string[];
}

export const generateAISuggestions = (accounts: AccountData[]): AISuggestion[] => {
  const suggestions: AISuggestion[] = [];

  accounts.forEach(account => {
    const previous = account.previousPeriod;
    if (!previous) return;

    // High ACOS Alert
    if (account.acos > 30 && account.ppcSpend > 100) {
      suggestions.push({
        id: `acos-alert-${account.id}`,
        type: 'alert',
        priority: 'high',
        title: `High ACOS Alert: ${account.name}`,
        description: `ACOS is ${account.acos.toFixed(1)}%, significantly above recommended 25% threshold`,
        accountId: account.id,
        accountName: account.name,
        metric: 'ACOS',
        currentValue: account.acos,
        targetValue: 25,
        potentialImpact: 'Reducing ACOS to 25% could save £' + ((account.ppcSpend * (account.acos - 25)) / 100).toFixed(0) + ' monthly',
        actionItems: [
          'Review keyword performance and pause low-performing terms',
          'Optimize bids for high-converting keywords',
          'Improve product listing optimization'
        ]
      });
    }

    // Sales Growth Opportunity
    const salesGrowth = previous.sales > 0 ? ((account.sales - previous.sales) / previous.sales) * 100 : 0;
    if (salesGrowth > 20 && account.acos < 20) {
      suggestions.push({
        id: `growth-opportunity-${account.id}`,
        type: 'growth',
        priority: 'high',
        title: `Scale Opportunity: ${account.name}`,
        description: `Sales up ${salesGrowth.toFixed(1)}% with efficient ${account.acos.toFixed(1)}% ACOS`,
        accountId: account.id,
        accountName: account.name,
        metric: 'Sales Growth',
        currentValue: salesGrowth,
        potentialImpact: 'Increase budget by 50% to capture more market share while maintaining efficiency',
        actionItems: [
          'Increase daily budgets by 25-50%',
          'Expand to additional keyword targets',
          'Consider launching new campaign types'
        ]
      });
    }

    // Declining Performance
    if (salesGrowth < -15) {
      suggestions.push({
        id: `decline-alert-${account.id}`,
        type: 'alert',
        priority: 'high',
        title: `Performance Decline: ${account.name}`,
        description: `Sales down ${Math.abs(salesGrowth).toFixed(1)}% compared to previous period`,
        accountId: account.id,
        accountName: account.name,
        metric: 'Sales Decline',
        currentValue: salesGrowth,
        potentialImpact: 'Address decline to prevent further revenue loss',
        actionItems: [
          'Analyze competitor activity and pricing',
          'Review search term reports for new negatives',
          'Check for inventory or listing issues'
        ]
      });
    }

    // TACOS Optimization
    if (account.tacos > 15 && account.tacos < previous.tacos) {
      suggestions.push({
        id: `tacos-optimization-${account.id}`,
        type: 'optimization',
        priority: 'medium',
        title: `TACOS Improving: ${account.name}`,
        description: `TACOS improved from ${previous.tacos.toFixed(1)}% to ${account.tacos.toFixed(1)}%`,
        accountId: account.id,
        accountName: account.name,
        metric: 'TACOS',
        currentValue: account.tacos,
        targetValue: 12,
        potentialImpact: 'Continue optimization to reach target 12% TACOS',
        actionItems: [
          'Maintain current optimization strategy',
          'Focus on organic rank improvements',
          'Monitor for plateau points'
        ]
      });
    }

    // Low Spend with Good Performance
    if (account.ppcSpend < 500 && account.acos < 20 && account.ppcSales > account.ppcSpend * 4) {
      suggestions.push({
        id: `underutilized-${account.id}`,
        type: 'opportunity',
        priority: 'medium',
        title: `Underutilized Account: ${account.name}`,
        description: `Low spend (£${account.ppcSpend}) but excellent ${account.acos.toFixed(1)}% ACOS`,
        accountId: account.id,
        accountName: account.name,
        metric: 'PPC Spend',
        currentValue: account.ppcSpend,
        potentialImpact: 'Could 2x spend while maintaining profitability',
        actionItems: [
          'Gradually increase daily budgets',
          'Expand keyword targeting',
          'Test additional campaign types'
        ]
      });
    }
  });

  // Sort by priority and potential impact
  return suggestions
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .slice(0, 6); // Limit to top 6 suggestions
};
