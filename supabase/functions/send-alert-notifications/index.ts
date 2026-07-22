import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface AlertSummary {
  dataGapAlerts: any[];
  performanceAlerts: any[];
  emailRecipients: string[];
}

const handler = async (req: Request): Promise<Response> => {
  console.log("🚨 Alert notification handler started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get email recipients
    const { data: emailConfig } = await supabase
      .from("alert_email_config")
      .select("*")
      .eq("enabled", true);

    if (!emailConfig || emailConfig.length === 0) {
      console.log("No email recipients configured");
      return new Response(
        JSON.stringify({ message: "No email recipients configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get unnotified data gap alerts
    const { data: dataGapAlerts } = await supabase
      .from("data_gap_alerts")
      .select("*")
      .is("notified_at", null)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    // Get unnotified performance alerts  
    const { data: performanceAlerts } = await supabase
      .from("performance_anomaly_alerts")
      .select("*")
      .is("notified_at", null)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    const totalAlerts = (dataGapAlerts?.length || 0) + (performanceAlerts?.length || 0);

    if (totalAlerts === 0) {
      console.log("No new alerts to notify");
      return new Response(
        JSON.stringify({ message: "No new alerts to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📧 Sending ${totalAlerts} alerts to ${emailConfig.length} recipients`);

    // Generate email content
    const emailHtml = generateAlertEmailHtml({
      dataGapAlerts: dataGapAlerts || [],
      performanceAlerts: performanceAlerts || [],
      emailRecipients: emailConfig.map(c => c.email_address)
    });

    // Send emails to all configured recipients
    const emailPromises = emailConfig.map(async (config) => {
      return resend.emails.send({
        from: "Amazon Dashboard Alerts <alerts@resend.dev>",
        to: [config.email_address],
        subject: `🚨 Dashboard Alert: ${totalAlerts} new issue${totalAlerts > 1 ? 's' : ''} detected`,
        html: emailHtml,
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);
    
    // Log email results
    emailResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log(`✅ Email sent to ${emailConfig[index].email_address}`);
      } else {
        console.error(`❌ Failed to send email to ${emailConfig[index].email_address}:`, result.reason);
      }
    });

    // Mark alerts as notified
    const now = new Date().toISOString();
    
    if (dataGapAlerts && dataGapAlerts.length > 0) {
      const dataGapIds = dataGapAlerts.map(alert => alert.id);
      await supabase
        .from("data_gap_alerts")
        .update({ notified_at: now })
        .in("id", dataGapIds);
    }

    if (performanceAlerts && performanceAlerts.length > 0) {
      const performanceIds = performanceAlerts.map(alert => alert.id);
      await supabase
        .from("performance_anomaly_alerts")
        .update({ notified_at: now })
        .in("id", performanceIds);
    }

    console.log("✅ Alert notifications completed successfully");

    return new Response(
      JSON.stringify({ 
        message: "Alert notifications sent successfully",
        totalAlerts,
        recipients: emailConfig.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("❌ Error in alert notification handler:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

function generateAlertEmailHtml(summary: AlertSummary): string {
  const { dataGapAlerts, performanceAlerts } = summary;
  const totalAlerts = dataGapAlerts.length + performanceAlerts.length;

  // Summarize alerts by type and severity
  const alertSummary = summarizeAlerts(dataGapAlerts, performanceAlerts);

  let html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; background: #fff; }
          .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0; }
          .summary-item { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; }
          .critical { border-left-color: #dc2626; }
          .warning { border-left-color: #f59e0b; }
          .info { border-left-color: #10b981; }
          .alert-details { background: #fafafa; border-radius: 6px; padding: 15px; margin: 15px 0; }
          .account-list { columns: 2; column-gap: 20px; margin: 10px 0; }
          .account-list li { break-inside: avoid; margin: 5px 0; }
          .footer { margin-top: 30px; padding: 20px; background: #f9fafb; text-align: center; border-radius: 0 0 8px 8px; }
          .cta-button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
          h3 { margin-top: 0; color: #374151; }
          .metric { font-size: 1.5em; font-weight: bold; color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚨 Daily Dashboard Alert Summary</h1>
          <p class="metric">${totalAlerts} Issues Detected</p>
          <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <div class="content">
          <div class="summary-box">
            <h3>📊 Alert Overview</h3>
            <div class="summary-grid">
              ${alertSummary.criticalCount > 0 ? `
                <div class="summary-item critical">
                  <div class="metric">${alertSummary.criticalCount}</div>
                  <div>Critical Issues</div>
                </div>
              ` : ''}
              ${alertSummary.warningCount > 0 ? `
                <div class="summary-item warning">
                  <div class="metric">${alertSummary.warningCount}</div>
                  <div>Warnings</div>
                </div>
              ` : ''}
              <div class="summary-item info">
                <div class="metric">${alertSummary.accountsAffected}</div>
                <div>Accounts Affected</div>
              </div>
            </div>
          </div>`;

  if (dataGapAlerts.length > 0) {
    const dataGapSummary = summarizeDataGapAlerts(dataGapAlerts);
    html += `
      <div class="alert-details">
        <h3>📊 Data Issues (${dataGapAlerts.length} alerts)</h3>
        <p><strong>Most Common Issues:</strong></p>
        <ul>
          ${dataGapSummary.topIssues.map(issue => `<li>${issue.type}: ${issue.count} accounts</li>`).join('')}
        </ul>
        <p><strong>Affected Accounts & Missing Dates:</strong></p>
        <div style="margin: 15px 0;">
          ${Object.entries(dataGapSummary.accountMissingDates).slice(0, 15).map(([account, dates]) => {
            const salesDates = dates.sales.length > 0 ? `Sales: ${dates.sales.join(', ')}` : '';
            const ppcDates = dates.ppc.length > 0 ? `PPC: ${dates.ppc.join(', ')}` : '';
            const missingInfo = [salesDates, ppcDates].filter(info => info).join(' | ');
            
            return `
              <div style="margin: 8px 0; padding: 8px; background: #f8f9fa; border-left: 3px solid #dc2626; font-size: 14px;">
                <strong>${account}</strong><br>
                <span style="color: #666; font-size: 13px;">${missingInfo}</span>
              </div>
            `;
          }).join('')}
          ${Object.keys(dataGapSummary.accountMissingDates).length > 15 ? `
            <div style="margin: 8px 0; font-style: italic; color: #666;">
              ... and ${Object.keys(dataGapSummary.accountMissingDates).length - 15} more accounts
            </div>
          ` : ''}
        </div>
      </div>`;
  }

  if (performanceAlerts.length > 0) {
    const perfSummary = summarizePerformanceAlerts(performanceAlerts);
    html += `
      <div class="alert-details">
        <h3>📈 Performance Issues (${performanceAlerts.length} alerts)</h3>
        <p><strong>Significant Changes Detected:</strong></p>
        <ul>
          ${perfSummary.topMetrics.map(metric => `<li>${metric.name}: ${metric.accounts} accounts affected</li>`).join('')}
        </ul>
        <p><strong>Largest Changes:</strong></p>
        <ul>
          ${perfSummary.largestChanges.slice(0, 5).map(change => `<li>${change.account}: ${change.metric} ${change.change > 0 ? '+' : ''}${change.change.toFixed(1)}%</li>`).join('')}
        </ul>
      </div>`;
  }

  html += `
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://your-dashboard-url.com" class="cta-button">View Dashboard</a>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Next Steps:</strong></p>
          <p>1. Review critical issues first 2. Check data sync status 3. Contact accounts with persistent issues</p>
          <p><small>You'll receive the next summary tomorrow at 8:00 AM</small></p>
        </div>
      </body>
    </html>
  `;

  return html;
}

function summarizeAlerts(dataGapAlerts: any[], performanceAlerts: any[]) {
  const allAlerts = [...dataGapAlerts, ...performanceAlerts];
  const criticalCount = allAlerts.filter(alert => alert.severity === 'high').length;
  const warningCount = allAlerts.filter(alert => alert.severity === 'medium').length;
  const accountsAffected = new Set(allAlerts.map(alert => alert.account_name)).size;

  return {
    criticalCount,
    warningCount,
    accountsAffected
  };
}

function summarizeDataGapAlerts(alerts: any[]) {
  const issueTypes = alerts.reduce((acc, alert) => {
    acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topIssues = Object.entries(issueTypes)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Group accounts by missing dates for sales and PPC
  const accountMissingDates = alerts.reduce((acc, alert) => {
    const accountName = alert.account_name;
    const alertType = alert.alert_type;
    const missingDate = alert.metadata?.missing_date || alert.last_data_date;

    if (!acc[accountName]) {
      acc[accountName] = { sales: [], ppc: [] };
    }

    if (alertType === 'missing_sales_data') {
      acc[accountName].sales.push(missingDate);
    } else if (alertType === 'missing_ppc_data') {
      acc[accountName].ppc.push(missingDate);
    }

    return acc;
  }, {} as Record<string, { sales: string[], ppc: string[] }>);

  const affectedAccounts = [...new Set(alerts.map(alert => alert.account_name))];

  return {
    topIssues,
    affectedAccounts,
    accountMissingDates
  };
}

function summarizePerformanceAlerts(alerts: any[]) {
  const metricTypes = alerts.reduce((acc, alert) => {
    acc[alert.metric_name] = (acc[alert.metric_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topMetrics = Object.entries(metricTypes)
    .map(([name, accounts]) => ({ name, accounts }))
    .sort((a, b) => b.accounts - a.accounts)
    .slice(0, 3);

  const largestChanges = alerts
    .sort((a, b) => Math.abs(b.percentage_change) - Math.abs(a.percentage_change))
    .slice(0, 5)
    .map(alert => ({
      account: alert.account_name,
      metric: alert.metric_name,
      change: alert.percentage_change
    }));

  return {
    topMetrics,
    largestChanges
  };
}

serve(handler);