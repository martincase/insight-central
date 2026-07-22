// Client token management for persisting tokens across sheet syncs

import type { AccountData } from '@/types/dashboard';

const CLIENT_TOKENS_STORAGE_KEY = 'client_access_tokens';
console.log('CLIENT_TOKENS_STORAGE_KEY defined as:', CLIENT_TOKENS_STORAGE_KEY);

export interface ClientTokenData {
  accountId: string;
  merchantToken: string;
  clientAccessToken: string;
  emailConfig?: {
    clientEmail: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    enabled: boolean;
    lastSent?: string;
  };
}

export const saveClientToken = (accountId: string, merchantToken: string, token: string): void => {
  try {
    console.log('saveClientToken: Saving token for account:', { accountId, merchantToken, token });
    const existingTokens = getStoredClientTokens();
    console.log('saveClientToken: Existing tokens:', existingTokens);
    
    const tokenData: ClientTokenData = {
      accountId,
      merchantToken,
      clientAccessToken: token
    };
    
    // Update or add the token
    const updatedTokens = existingTokens.filter(t => t.accountId !== accountId && t.merchantToken !== merchantToken);
    updatedTokens.push(tokenData);
    
    console.log('saveClientToken: Updated tokens to save:', updatedTokens);
    localStorage.setItem(CLIENT_TOKENS_STORAGE_KEY, JSON.stringify(updatedTokens));
    console.log('saveClientToken: Token saved successfully');
  } catch (error) {
    console.error('Error saving client token:', error);
  }
};

export const getStoredClientTokens = (): ClientTokenData[] => {
  try {
    console.log('getStoredClientTokens: Using storage key:', CLIENT_TOKENS_STORAGE_KEY);
    const stored = localStorage.getItem(CLIENT_TOKENS_STORAGE_KEY);
    console.log('getStoredClientTokens: Raw stored value:', stored);
    const tokens = stored ? JSON.parse(stored) : [];
    console.log('getStoredClientTokens: Parsed tokens:', tokens);
    return tokens;
  } catch (error) {
    console.error('Error loading client tokens:', error);
    return [];
  }
};

export const getClientTokenForAccount = (accountId: string, merchantToken: string): string | undefined => {
  const tokens = getStoredClientTokens();
  const tokenData = tokens.find(t => t.accountId === accountId || t.merchantToken === merchantToken);
  return tokenData?.clientAccessToken;
};

export const saveEmailConfig = (accountId: string, merchantToken: string, emailConfig: any): void => {
  try {
    const existingTokens = getStoredClientTokens();
    const tokenIndex = existingTokens.findIndex(t => t.accountId === accountId || t.merchantToken === merchantToken);
    
    if (tokenIndex >= 0) {
      existingTokens[tokenIndex].emailConfig = emailConfig;
      localStorage.setItem(CLIENT_TOKENS_STORAGE_KEY, JSON.stringify(existingTokens));
    }
  } catch (error) {
    console.error('Error saving email config:', error);
  }
};

export const mergeClientDataWithAccounts = (accounts: AccountData[]): AccountData[] => {
  const clientTokens = getStoredClientTokens();
  console.log('mergeClientDataWithAccounts: Stored client tokens:', clientTokens);
  console.log('mergeClientDataWithAccounts: Accounts to merge:', accounts.map(acc => ({ id: acc.id, name: acc.name, merchantToken: acc.merchantToken })));
  
  return accounts.map(account => {
    // Try to find matching token by merchantToken (primary) or old accountId format
    const tokenData = clientTokens.find(t => 
      t.merchantToken === account.merchantToken || 
      t.accountId === account.id ||
      t.accountId === account.merchantToken // Handle case where token was saved with merchant token as ID
    );
    
    console.log(`mergeClientDataWithAccounts: Account ${account.name} (${account.id}/${account.merchantToken}) - Found token:`, !!tokenData);
    
    if (tokenData) {
      return {
        ...account,
        clientAccessToken: tokenData.clientAccessToken,
        emailConfig: tokenData.emailConfig
      };
    }
    
    return account;
  });
};