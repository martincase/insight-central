import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TagInfo {
  id: string;
  tag: 'ramp_up' | 'under_performing' | 'new_product_launch' | 'seasonal_peak';
  starts_at: string;
  expires_at: string | null;
}

export type TagType = TagInfo['tag'];

export const TAG_OPTIONS: { value: TagType; label: string }[] = [
  { value: 'ramp_up', label: 'Ramp Up' },
  { value: 'under_performing', label: 'Under Performing' },
  { value: 'new_product_launch', label: 'New Product Launch' },
  { value: 'seasonal_peak', label: 'Seasonal Peak' },
];

export function useAccountTags() {
  const [tagsMap, setTagsMap] = useState<Record<string, TagInfo[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    const { data, error } = await supabase
      .from('account_tags')
      .select('*')
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (!error && data) {
      const map: Record<string, TagInfo[]> = {};
      for (const row of data) {
        const mt = row.merchant_token as string;
        if (!map[mt]) map[mt] = [];
        map[mt].push({
          id: row.id,
          tag: row.tag as TagType,
          starts_at: row.starts_at,
          expires_at: row.expires_at,
        });
      }
      setTagsMap(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const addTag = async (merchantToken: string, tag: TagType, expiresAt?: Date) => {
    const { error } = await supabase
      .from('account_tags')
      .upsert(
        {
          merchant_token: merchantToken,
          tag,
          starts_at: new Date().toISOString(),
          expires_at: expiresAt ? expiresAt.toISOString() : null,
        },
        { onConflict: 'merchant_token,tag' }
      );
    if (!error) await fetchTags();
    return error;
  };

  const removeTag = async (merchantToken: string, tag: TagType) => {
    const { error } = await supabase
      .from('account_tags')
      .delete()
      .eq('merchant_token', merchantToken)
      .eq('tag', tag);
    if (!error) await fetchTags();
    return error;
  };

  return { tagsMap, loading, addTag, removeTag, refetch: fetchTags };
}
