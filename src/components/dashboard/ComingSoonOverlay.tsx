import { Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ComingSoonOverlayProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const ComingSoonOverlay = ({ 
  title, 
  description = "Coming Soon",
}: ComingSoonOverlayProps) => (
  <Card className="border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white shadow-sm">
    <CardContent className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
          <Clock className="h-5 w-5 text-slate-400" />
        </div>
        <h3 className="text-base font-medium text-slate-600">{title}</h3>
        <p className="text-sm text-slate-400 mt-1">{description}</p>
      </div>
    </CardContent>
  </Card>
);

// Compact version for grouping multiple coming soon items
interface ComingSoonGroupProps {
  items: Array<{ title: string; description?: string }>;
}

export const ComingSoonGroup = ({ items }: ComingSoonGroupProps) => (
  <Card className="border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white shadow-sm">
    <CardContent className="py-8">
      <div className="flex flex-wrap items-center justify-center gap-8">
        {items.map((item, index) => (
          <div key={index} className="text-center px-6">
            <div className="w-9 h-9 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-600">{item.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{item.description || "Coming Soon"}</p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);
