
import { useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BulkUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onBulkUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BulkUploadDialog = ({ isOpen, onOpenChange, onBulkUpload }: BulkUploadDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full border-green-200 hover:bg-green-50 hover:border-green-300 transition-all duration-200 shadow-sm"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Upload Accounts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p className="mb-2">Upload a CSV file with the following format:</p>
            <div className="bg-gray-100 p-3 rounded text-xs font-mono">
              Account Name,Merchant Token,PPC Account Name<br />
              Example Account 1,MERCHANT001,PPC_ACCOUNT_1<br />
              Example Account 2,MERCHANT002,PPC_ACCOUNT_2
            </div>
            <p className="mt-2 text-xs text-gray-500">
              PPC Account Name is optional but required for live PPC data integration
            </p>
          </div>
          
          <div>
            <Label htmlFor="file-upload">Choose CSV File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv"
              onChange={onBulkUpload}
              className="mt-1"
            />
          </div>
          
          <div className="flex items-center text-sm text-blue-600">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            <span>Only CSV files are supported</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
