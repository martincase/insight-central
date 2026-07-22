import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const SUPABASE_URL = 'https://wgrephgnrldsyipbvjco.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVwaGducmxkc3lpcGJ2amNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzQwNTQsImV4cCI6MjA3MDkxMDA1NH0.09lGFOFoZtFjriGjFankGZ2qcXJjWpydQTn1jyMyUpo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const backupDate = new Date().toISOString().split('T')[0];
    console.log(`🔄 Starting weekly backup for ${backupDate}`);

    let totalBackedUp = 0;

    // Backup accounts_master data
    console.log('📋 Backing up accounts_master...');
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts_master')
      .select('*');

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    if (accounts && accounts.length > 0) {
      const accountsBackup = accounts.map(account => ({
        backup_date: backupDate,
        original_id: account.id,
        account_name: account.account_name,
        merchant_token: account.merchant_token,
        account_type: account.account_type,
        ppc_account_name: account.ppc_account_name,
        seller_central_link: account.seller_central_link,
        status: account.status,
        is_starred: account.is_starred,
        original_created_at: account.created_at,
        original_updated_at: account.updated_at
      }));

      const { error: accountsBackupError } = await supabase
        .from('accounts_master_backup')
        .insert(accountsBackup);

      if (accountsBackupError) {
        throw new Error(`Failed to backup accounts: ${accountsBackupError.message}`);
      }

      totalBackedUp += accounts.length;
      console.log(`✅ Backed up ${accounts.length} accounts`);
    }

    // Backup daily_sales_ppc_data
    console.log('📊 Backing up daily_sales_ppc_data...');
    const { data: salesData, error: salesError } = await supabase
      .from('daily_sales_ppc_data')
      .select('*');

    if (salesError) {
      throw new Error(`Failed to fetch sales data: ${salesError.message}`);
    }

    if (salesData && salesData.length > 0) {
      const salesBackup = salesData.map(record => ({
        backup_date: backupDate,
        original_id: record.id,
        record_date: record.record_date,
        merchant_token: record.merchant_token,
        account_name: record.account_name,
        sales: record.sales,
        ppc_sales: record.ppc_sales,
        ppc_spend: record.ppc_spend,
        page_views: record.page_views,
        units_ordered: record.units_ordered,
        conversion_rate: record.conversion_rate,
        buy_box_percentage: record.buy_box_percentage,
        advertising_reliance: record.advertising_reliance,
        tacos: record.tacos,
        acos: record.acos,
        original_created_at: record.created_at
      }));

      const { error: salesBackupError } = await supabase
        .from('daily_sales_ppc_data_backup')
        .insert(salesBackup);

      if (salesBackupError) {
        throw new Error(`Failed to backup sales data: ${salesBackupError.message}`);
      }

      totalBackedUp += salesData.length;
      console.log(`✅ Backed up ${salesData.length} sales/PPC records`);
    }

    // Backup daily_asin_data
    console.log('🏷️ Backing up daily_asin_data...');
    const { data: asinData, error: asinError } = await supabase
      .from('daily_asin_data')
      .select('*');

    if (asinError) {
      throw new Error(`Failed to fetch ASIN data: ${asinError.message}`);
    }

    if (asinData && asinData.length > 0) {
      const asinBackup = asinData.map(record => ({
        backup_date: backupDate,
        original_id: record.id,
        record_date: record.record_date,
        merchant_token: record.merchant_token,
        account_name: record.account_name,
        parent_asin: record.parent_asin,
        child_asin: record.child_asin,
        product_title: record.product_title,
        sales: record.sales,
        units_sold: record.units_sold,
        page_views: record.page_views,
        conversion_rate: record.conversion_rate,
        buy_box_percentage: record.buy_box_percentage,
        original_created_at: record.created_at
      }));

      const { error: asinBackupError } = await supabase
        .from('daily_asin_data_backup')
        .insert(asinBackup);

      if (asinBackupError) {
        throw new Error(`Failed to backup ASIN data: ${asinBackupError.message}`);
      }

      totalBackedUp += asinData.length;
      console.log(`✅ Backed up ${asinData.length} ASIN records`);
    }

    // Backup daily_campaign_data
    console.log('📈 Backing up daily_campaign_data...');
    const { data: campaignData, error: campaignError } = await supabase
      .from('daily_campaign_data')
      .select('*');

    if (campaignError) {
      throw new Error(`Failed to fetch campaign data: ${campaignError.message}`);
    }

    if (campaignData && campaignData.length > 0) {
      const campaignBackup = campaignData.map(record => ({
        backup_date: backupDate,
        original_id: record.id,
        record_date: record.record_date,
        merchant_token: record.merchant_token,
        account_name: record.account_name,
        campaign_name: record.campaign_name,
        sales: record.sales,
        spend: record.spend,
        acos: record.acos,
        alert_type: record.alert_type,
        alert_message: record.alert_message,
        original_created_at: record.created_at
      }));

      const { error: campaignBackupError } = await supabase
        .from('daily_campaign_data_backup')
        .insert(campaignBackup);

      if (campaignBackupError) {
        throw new Error(`Failed to backup campaign data: ${campaignBackupError.message}`);
      }

      totalBackedUp += campaignData.length;
      console.log(`✅ Backed up ${campaignData.length} campaign records`);
    }

    console.log(`🎉 Weekly backup completed successfully! Total records backed up: ${totalBackedUp}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Weekly backup completed successfully for ${backupDate}`,
      totalRecords: totalBackedUp,
      backupDate: backupDate
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Backup error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});