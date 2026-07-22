import React from 'react';
import { Rocket, Wrench } from 'lucide-react';

interface DisabledFeatureOverlayProps {
  featureName: string;
  messageType: 'coming_soon' | 'temporarily_unavailable';
  children: React.ReactNode;
}

export const DisabledFeatureOverlay: React.FC<DisabledFeatureOverlayProps> = ({
  featureName,
  messageType,
  children
}) => {
  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Overlay */}
      <div className="absolute inset-0 bg-muted/90 backdrop-blur-md z-50 flex items-center justify-center">
        <div className="text-center p-6 bg-background/80 rounded-lg shadow-lg border border-border">
          {messageType === 'coming_soon' ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Rocket className="h-5 w-5 text-primary" />
                <p className="text-xl font-bold text-foreground">{featureName}</p>
              </div>
              <p className="text-sm text-muted-foreground">Coming Soon</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Wrench className="h-5 w-5 text-amber-500" />
                <p className="text-xl font-bold text-foreground">{featureName}</p>
              </div>
              <p className="text-sm text-muted-foreground">Temporarily Unavailable</p>
              <p className="text-xs text-muted-foreground mt-1">We are working on a fix</p>
            </>
          )}
        </div>
      </div>
      
      {/* Dimmed content underneath */}
      <div className="opacity-20 pointer-events-none">
        {children}
      </div>
    </div>
  );
};
