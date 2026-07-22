import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export const FeatureVisibilityTab = () => {
  const { features, isLoading, updateFeature } = useFeatureVisibility();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Client Dashboard Feature Visibility
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Control which features are visible to clients. Disabled features will show an overlay message.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>When Disabled, Show</TableHead>
              <TableHead className="text-right">Toggle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.map((feature) => (
              <TableRow key={feature.id}>
                <TableCell className="font-medium">
                  {feature.feature_name}
                  <span className="block text-xs text-muted-foreground font-mono">
                    {feature.feature_key}
                  </span>
                </TableCell>
                <TableCell>
                  {feature.is_enabled ? (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                      <Eye className="h-3 w-3 mr-1" />
                      Visible
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Hidden
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={feature.disabled_message_type}
                    onValueChange={(value: 'coming_soon' | 'temporarily_unavailable') => 
                      updateFeature(feature.feature_key, feature.is_enabled, value)
                    }
                    disabled={feature.is_enabled}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coming_soon">🚀 Coming Soon</SelectItem>
                      <SelectItem value="temporarily_unavailable">🔧 Temporarily Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Switch
                    checked={feature.is_enabled}
                    onCheckedChange={(checked) => 
                      updateFeature(feature.feature_key, checked)
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
