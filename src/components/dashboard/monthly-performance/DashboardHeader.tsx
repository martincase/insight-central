import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Download } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  onExportCsv: () => void;
  isLoading?: boolean;
  dataLength: number;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  onExportCsv,
  isLoading = false,
  dataLength
}) => {
  return (
    <CardHeader className="bg-gradient-to-r from-accent to-muted border-b border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <Calendar className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {title}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-1">
              {subtitle}
            </CardDescription>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExportCsv}
          disabled={isLoading || dataLength === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
    </CardHeader>
  );
};