// Utility functions for managing client access tokens and URLs

import { saveClientToken } from './clientTokenManager';

export const generateClientAccessToken = (): string => {
  // Generate a secure random token
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

export const generateClientURL = (accountId: string, token: string): string => {
  return `${window.location.origin}/client/${accountId}/${token}`;
};

export const validateClientAccess = (accounts: any[], accountId: string, token: string): any | null => {
  return accounts.find(account => 
    account.id === accountId && account.clientAccessToken === token
  ) || null;
};

export const generateAndSaveClientToken = (accountId: string, merchantToken: string): string => {
  const token = generateClientAccessToken();
  saveClientToken(accountId, merchantToken, token);
  return token;
};