import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { Resend } from 'npm:resend@4.0.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

interface ClientAlert {
  id: string;
  account_name: string;
  merchant_token: string;
  client_email: string;
  alert_type: string;
  metric_value: number;
  threshold_value: number;
  detection_date: string;
  message: string;
  metadata: any;
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);
    
    console.log('Checking for unnotified client alerts...');
    
    // Get all unnotified alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('client_threshold_alerts')
      .select('*')
      .is('notified_at', null)
      .eq('status', 'active')
      .order('detection_date', { ascending: false });
    
    if (alertsError) throw alertsError;
    
    if (!alerts || alerts.length === 0) {
      console.log('No alerts to send.');
      return new Response(
        JSON.stringify({ success: true, message: 'No alerts to send' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Group alerts by client email
    const alertsByEmail = new Map<string, ClientAlert[]>();
    
    for (const alert of alerts as ClientAlert[]) {
      if (!alertsByEmail.has(alert.client_email)) {
        alertsByEmail.set(alert.client_email, []);
      }
      alertsByEmail.get(alert.client_email)!.push(alert);
    }
    
    console.log(`Sending alerts to ${alertsByEmail.size} clients...`);
    
    const emailsSent = [];
    const alertIds = [];
    
    for (const [clientEmail, clientAlerts] of alertsByEmail.entries()) {
      try {
        const emailHtml = generateAlertEmail(clientAlerts);
        
        const { data, error } = await resend.emails.send({
          from: 'Amazon Alerts <onboarding@resend.dev>',
          to: [clientEmail],
          subject: `⚠️ Performance Alert: ${clientAlerts.length} Issue${clientAlerts.length > 1 ? 's' : ''} Detected`,
          html: emailHtml
        });
        
        if (error) {
          console.error(`Failed to send email to ${clientEmail}:`, error);
        } else {
          console.log(`✓ Email sent to ${clientEmail}`);
          emailsSent.push(clientEmail);
          alertIds.push(...clientAlerts.map(a => a.id));
        }
      } catch (emailError) {
        console.error(`Error sending email to ${clientEmail}:`, emailError);
      }
    }
    
    // Mark alerts as notified
    if (alertIds.length > 0) {
      const { error: updateError } = await supabase
        .from('client_threshold_alerts')
        .update({ notified_at: new Date().toISOString() })
        .in('id', alertIds);
      
      if (updateError) {
        console.error('Error updating alert notification status:', updateError);
      } else {
        console.log(`✓ Marked ${alertIds.length} alerts as notified`);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        emails_sent: emailsSent.length,
        alerts_processed: alertIds.length
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Error in send client alerts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function generateAlertEmail(alerts: ClientAlert[]): string {
  const date = new Date(alerts[0].detection_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const buyBoxAlerts = alerts.filter(a => a.alert_type === 'buy_box');
  const conversionRateAlerts = alerts.filter(a => a.alert_type === 'conversion_rate');
  
  let buyBoxSection = '';
  if (buyBoxAlerts.length > 0) {
    buyBoxSection = `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: 600; color: #dc2626; margin-bottom: 12px;">
          ⚠️ Buy Box Alerts (${buyBoxAlerts.length})
        </h2>
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; border-radius: 4px;">
          ${buyBoxAlerts.map(alert => `
            <div style="margin-bottom: 8px;">
              <strong style="color: #1f2937;">${alert.account_name}</strong><br/>
              <span style="color: #6b7280; font-size: 14px;">
                Current: ${alert.metric_value.toFixed(1)}% | Threshold: ${alert.threshold_value}%
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  let conversionRateSection = '';
  if (conversionRateAlerts.length > 0) {
    conversionRateSection = `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: 600; color: #ea580c; margin-bottom: 12px;">
          📉 Conversion Rate Alerts (${conversionRateAlerts.length})
        </h2>
        <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 12px 16px; border-radius: 4px;">
          ${conversionRateAlerts.map(alert => {
            const prevValue = alert.metadata?.previous_value || 0;
            const percentChange = alert.metadata?.percent_change || 0;
            return `
              <div style="margin-bottom: 8px;">
                <strong style="color: #1f2937;">${alert.account_name}</strong><br/>
                <span style="color: #6b7280; font-size: 14px;">
                  Dropped ${Math.abs(percentChange).toFixed(1)}%: ${prevValue.toFixed(1)}% → ${alert.metric_value.toFixed(1)}%
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">
            📊 Daily Performance Alert
          </h1>
          <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">
            ${date}
          </p>
        </div>
        
        <div style="background-color: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          
          <p style="font-size: 16px; color: #4b5563; margin-bottom: 24px;">
            Your account${alerts.length > 1 ? 's have' : ' has'} triggered ${alerts.length} alert${alerts.length > 1 ? 's' : ''} based on your configured thresholds:
          </p>
          
          ${buyBoxSection}
          ${conversionRateSection}
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <a href="https://your-dashboard-url.com" style="display: inline-block; background-color: #667eea; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 14px;">
              View Dashboard
            </a>
          </div>
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              You're receiving this email because you've configured alerts for your Amazon account${alerts.length > 1 ? 's' : ''}.
            </p>
            <p style="font-size: 12px; color: #9ca3af; margin: 4px 0 0 0;">
              Next summary: Tomorrow at 9:00 AM
            </p>
          </div>
          
        </div>
        
      </body>
    </html>
  `;
}
