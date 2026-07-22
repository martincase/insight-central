
import { ArrowLeft, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCountryInfo } from '@/utils/countryUtils';
import { toast } from 'sonner';
import type { AccountData } from '@/types/dashboard';
import { isVendorAccount } from '@/utils/vendorUtils';

interface AppHeaderProps {
  logoSrc: string;
  title: string;
  subtitle: string;
  features: string;
  focusedAccount?: AccountData | null;
  onUnfocus?: () => void;
  topActions?: React.ReactNode;
  bottomActions?: React.ReactNode;
  children?: React.ReactNode;
}

export const AppHeader = ({ 
  logoSrc, 
  title, 
  subtitle, 
  features,
  focusedAccount,
  onUnfocus,
  topActions,
  bottomActions,
  children
}: AppHeaderProps) => {
  const countryInfo = focusedAccount ? getCountryInfo(focusedAccount.merchantToken) : null;
  
  const shareUrl = focusedAccount?.shareCode 
    ? `${window.location.origin}/${focusedAccount.name.toLowerCase().trim().replace(/\s+/g, '')}/${focusedAccount.shareCode}`
    : '';

  const copyBrandLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Brand link copied to clipboard');
    }
  };
  
  return (
    <div className="rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
      {/* Top Row - Gradient section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-4 py-3 md:px-6 md:py-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-3 md:gap-6">
            <img 
              src={logoSrc} 
              alt="Logo" 
              className="h-8 md:h-14 w-auto"
            />
            <div className="hidden md:block border-l-2 border-white/30 pl-6">
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {title}
              </h1>
            </div>
            <h1 className="md:hidden text-base font-bold text-white">
              Amazon Dashboard
            </h1>
          </div>
          
          {/* Top-right actions (Sync + Date) */}
          {topActions || children}
        </div>
      </div>

      {/* Focused Account Section */}
      {focusedAccount && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-3 md:px-6 md:py-4 border-t border-blue-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3">
              {countryInfo?.flagImage && (
                <img 
                  src={countryInfo.flagImage} 
                  alt={countryInfo.name} 
                  className="w-8 h-5 md:w-10 md:h-7 object-cover rounded-sm shadow-sm" 
                />
              )}
              <div className="flex flex-col">
                <h2 className="text-lg md:text-xl font-bold text-gray-900">
                  {focusedAccount.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      isVendorAccount(focusedAccount.merchantToken) 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isVendorAccount(focusedAccount.merchantToken) ? 'Vendor' : 'Seller'}
                    </span>
                  <span className="text-xs text-gray-500">
                    {countryInfo?.name || 'Unknown Country'}
                  </span>
                  {shareUrl && (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Brand View
                      </a>
                      <button
                        onClick={copyBrandLink}
                        className="text-gray-400 hover:text-gray-600 p-0.5"
                        title="Copy brand link"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {onUnfocus && (
              <Button
                variant="outline"
                size="sm"
                onClick={onUnfocus}
                className="flex items-center gap-1.5 text-sm"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Show All Accounts</span>
                <span className="sm:hidden">Back</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Row - Action buttons on white background */}
      {bottomActions && (
        <div className="bg-white px-4 py-2 md:px-6 md:py-3 border-t border-gray-200">
          {bottomActions}
        </div>
      )}
    </div>
  );
};
