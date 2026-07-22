import html2canvas from 'html2canvas';
import emailjs from 'emailjs-com';
import type { AccountData } from '@/types/dashboard';

// EmailJS configuration storage key
const EMAILJS_CONFIG_KEY = 'emailjs_config';

export interface ScreenshotEmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export const captureScreenshot = async (elementId: string): Promise<string> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      height: element.scrollHeight,
      width: element.scrollWidth,
    });

    return canvas.toDataURL('image/png', 0.8);
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    throw new Error('Failed to capture screenshot');
  }
};

export const getEmailJSConfig = (): ScreenshotEmailConfig | null => {
  try {
    const savedConfig = localStorage.getItem(EMAILJS_CONFIG_KEY);
    if (savedConfig) {
      return JSON.parse(savedConfig);
    }
  } catch (error) {
    console.error('Error loading EmailJS config:', error);
  }
  return null;
};

export const sendScreenshotEmail = async (
  account: AccountData,
  screenshotDataUrl: string,
  config?: ScreenshotEmailConfig
): Promise<void> => {
  if (!account.emailConfig?.clientEmail || !account.emailConfig?.enabled) {
    throw new Error('Email configuration not set up for this account');
  }

  const emailConfig = config || getEmailJSConfig();
  
  if (!emailConfig) {
    throw new Error('EmailJS configuration not found. Please configure EmailJS first.');
  }

  try {
    // Initialize EmailJS
    emailjs.init(emailConfig.publicKey);

    const templateParams = {
      to_email: account.emailConfig.clientEmail,
      account_name: account.name,
      screenshot_data: screenshotDataUrl,
      sales: account.sales.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      }),
      ppc_spend: account.ppcSpend.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      }),
      acos: (account.acos * 100).toFixed(1) + '%',
      tacos: (account.tacos * 100).toFixed(1) + '%',
      date: new Date().toLocaleDateString(),
      frequency: account.emailConfig.frequency,
    };

    await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templateId,
      templateParams
    );

    console.log(`Screenshot email sent successfully to ${account.emailConfig.clientEmail}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send screenshot email');
  }
};

export const shouldSendEmail = (account: AccountData): boolean => {
  if (!account.emailConfig?.enabled || !account.emailConfig?.clientEmail) {
    return false;
  }

  if (!account.emailConfig.lastSent) {
    return true;
  }

  const lastSent = new Date(account.emailConfig.lastSent);
  const now = new Date();
  const timeDiff = now.getTime() - lastSent.getTime();
  
  switch (account.emailConfig.frequency) {
    case 'daily':
      return timeDiff >= 24 * 60 * 60 * 1000; // 24 hours
    case 'weekly':
      return timeDiff >= 7 * 24 * 60 * 60 * 1000; // 7 days
    case 'monthly':
      return timeDiff >= 30 * 24 * 60 * 60 * 1000; // 30 days
    default:
      return false;
  }
};

export const updateLastSentTime = (accounts: AccountData[], accountId: string): AccountData[] => {
  return accounts.map(account => 
    account.id === accountId && account.emailConfig
      ? {
          ...account,
          emailConfig: {
            ...account.emailConfig,
            lastSent: new Date().toISOString(),
          }
        }
      : account
  );
};