import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeatureVisibility {
  id: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
  disabled_message_type: 'coming_soon' | 'temporarily_unavailable';
  updated_at: string;
}

// Master list of features - add new features here and they'll auto-sync to DB
export const FEATURE_DEFINITIONS: Array<{ key: string; name: string; defaultEnabled: boolean }> = [
  { key: 'sales_heatmap', name: 'Sales Heatmap', defaultEnabled: true },
  { key: 'metrics_grid', name: 'Metrics Grid', defaultEnabled: true },
  { key: 'monthly_performance_view', name: 'Monthly Performance Chart', defaultEnabled: true },
  { key: 'monthly_performance_table', name: 'Monthly Performance Table', defaultEnabled: true },
  { key: 'asin_performance', name: 'ASIN Performance', defaultEnabled: false },
  { key: 'inventory_table', name: 'Inventory', defaultEnabled: false },
  { key: 'top_search_terms', name: 'Top Search Terms', defaultEnabled: true },
  { key: 'keyword_themes', name: 'Keyword Themes', defaultEnabled: true },
  { key: 'search_term_keyword_map', name: 'Search Term → Keyword Map', defaultEnabled: true },
  { key: 'buy_box_alerts', name: 'Buy Box Alerts', defaultEnabled: true },
  { key: 'performance_alerts', name: 'Performance Alerts', defaultEnabled: true },
];

export const useFeatureVisibility = () => {
  const [features, setFeatures] = useState<FeatureVisibility[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const syncMissingFeatures = useCallback(async (existingKeys: string[]) => {
    const missingFeatures = FEATURE_DEFINITIONS.filter(
      def => !existingKeys.includes(def.key)
    );

    if (missingFeatures.length === 0) return;

    console.log('Auto-adding missing features:', missingFeatures.map(f => f.key));

    const insertData = missingFeatures.map(f => ({
      feature_key: f.key,
      feature_name: f.name,
      is_enabled: f.defaultEnabled,
      disabled_message_type: 'coming_soon'
    }));

    const { error } = await supabase
      .from('client_feature_visibility')
      .insert(insertData);

    if (error) {
      console.error('Error auto-adding features:', error);
    }
  }, []);

  const fetchFeatures = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('client_feature_visibility')
        .select('*')
        .order('feature_name');

      if (error) throw error;

      const existingKeys = (data || []).map(f => f.feature_key);
      
      // Auto-sync missing features
      await syncMissingFeatures(existingKeys);

      // Re-fetch if we added any
      const missingCount = FEATURE_DEFINITIONS.filter(
        def => !existingKeys.includes(def.key)
      ).length;

      if (missingCount > 0) {
        const { data: refreshedData } = await supabase
          .from('client_feature_visibility')
          .select('*')
          .order('feature_name');
        setFeatures((refreshedData || []) as FeatureVisibility[]);
      } else {
        setFeatures((data || []) as FeatureVisibility[]);
      }
    } catch (error) {
      console.error('Error fetching feature visibility:', error);
    } finally {
      setIsLoading(false);
    }
  }, [syncMissingFeatures]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const isEnabled = useCallback((featureKey: string): boolean => {
    const feature = features.find(f => f.feature_key === featureKey);
    return feature?.is_enabled ?? true;
  }, [features]);

  const getMessageType = useCallback((featureKey: string): 'coming_soon' | 'temporarily_unavailable' => {
    const feature = features.find(f => f.feature_key === featureKey);
    return feature?.disabled_message_type ?? 'coming_soon';
  }, [features]);

  const getFeatureName = useCallback((featureKey: string): string => {
    const feature = features.find(f => f.feature_key === featureKey);
    return feature?.feature_name ?? featureKey;
  }, [features]);

  const updateFeature = useCallback(async (
    featureKey: string, 
    isEnabled: boolean, 
    messageType?: 'coming_soon' | 'temporarily_unavailable'
  ) => {
    try {
      const updateData: { is_enabled: boolean; disabled_message_type?: string; updated_at: string } = {
        is_enabled: isEnabled,
        updated_at: new Date().toISOString()
      };
      
      if (messageType) {
        updateData.disabled_message_type = messageType;
      }

      const { error } = await supabase
        .from('client_feature_visibility')
        .update(updateData)
        .eq('feature_key', featureKey);

      if (error) throw error;

      // Update local state
      setFeatures(prev => prev.map(f => 
        f.feature_key === featureKey 
          ? { ...f, is_enabled: isEnabled, ...(messageType && { disabled_message_type: messageType }) }
          : f
      ));

      toast.success(`Feature "${featureKey}" updated`);
    } catch (error) {
      console.error('Error updating feature visibility:', error);
      toast.error('Failed to update feature');
    }
  }, []);

  return {
    features,
    isLoading,
    isEnabled,
    getMessageType,
    getFeatureName,
    updateFeature,
    refetch: fetchFeatures
  };
};
