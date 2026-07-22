import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ExcelExportButtonProps {
  data: any[];
  filename: string;
  sheetName?: string;
}

export const ExcelExportButton = ({ data, filename, sheetName = 'Data' }: ExcelExportButtonProps) => {
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length} className="gap-2">
      <Download className="h-4 w-4" />
      Export Excel
    </Button>
  );
};
