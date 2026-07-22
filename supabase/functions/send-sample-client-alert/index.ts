import { Resend } from "npm:resend@4.0.0";

const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SampleAlertRequest {
  clientEmail: string;
  accountName: string;
  thresholds: {
    buy_box: number;
    conversion_rate_drop: number;
  };
  enabledAlertTypes: string[];
}

Deno.serve(async (req) => {
  console.log("📧 Sample client alert email handler started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientEmail, accountName, thresholds, enabledAlertTypes }: SampleAlertRequest = await req.json();

    if (!clientEmail || !accountName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const buyBoxEnabled = enabledAlertTypes.includes('buy_box');
    const conversionRateEnabled = enabledAlertTypes.includes('conversion_rate');
    
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">
              📨 Sample Performance Alert
            </h1>
            <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">
              ${date}
            </p>
          </div>
          
          <div style="background-color: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
              <strong style="color: #92400e;">📨 This is a sample notification</strong><br/>
              <span style="color: #78350f; font-size: 14px;">Real alerts will be sent when actual issues are detected</span>
            </div>
            
            <p style="font-size: 16px; color: #4b5563; margin-bottom: 24px;">
              Hi there! This shows what your alert emails will look like for <strong>${accountName}</strong>.
            </p>
            
            ${buyBoxEnabled ? `
            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: 600; color: #dc2626; margin-bottom: 12px;">
                ⚠️ Buy Box Alert Example
              </h2>
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; border-radius: 4px;">
                <div style="margin-bottom: 8px;">
                  <strong style="color: #1f2937;">${accountName}</strong><br/>
                  <span style="color: #6b7280; font-size: 14px;">
                    Current: 95.2% | Threshold: ${thresholds.buy_box}%
                  </span>
                </div>
              </div>
            </div>
            ` : ''}
            
            ${conversionRateEnabled ? `
            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: 600; color: #ea580c; margin-bottom: 12px;">
                📉 Conversion Rate Alert Example
              </h2>
              <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 12px 16px; border-radius: 4px;">
                <div style="margin-bottom: 8px;">
                  <strong style="color: #1f2937;">${accountName}</strong><br/>
                  <span style="color: #6b7280; font-size: 14px;">
                    Dropped 30.9%: 12.3% → 8.5% (Threshold: ${thresholds.conversion_rate_drop}%)
                  </span>
                </div>
              </div>
            </div>
            ` : ''}
            
            ${!buyBoxEnabled && !conversionRateEnabled ? `
              <p style="color: #6b7280; font-style: italic;">No alert types are currently enabled.</p>
            ` : ''}
            
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                You're receiving this sample email because you configured alerts for ${accountName}.
              </p>
              <p style="font-size: 12px; color: #9ca3af; margin: 4px 0 0 0;">
                Real alerts will be sent daily at 9:00 AM when thresholds are breached.
              </p>
            </div>
            
          </div>
          
        </body>
      </html>
    `;

    let primaryData: any | undefined;
    try {
      const { data, error } = await resend.emails.send({
        from: 'Amazon Alerts <onboarding@resend.dev>',
        to: [clientEmail],
        subject: `📨 Sample Alert: ${accountName} Performance Notification`,
        html: emailHtml,
      });

      if (error) {
        throw error;
      }

      primaryData = data;
      console.log(`✅ Sample alert email sent successfully to ${clientEmail}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Sample notification sent successfully",
          emailId: primaryData?.id
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (error: any) {
      console.error("❌ Failed to send sample alert email:", error);

      const msg: string = error?.message || "";
      const match = msg.match(/\(([^)]+)\)/); // extract allowed test email from message
      const allowedEmail = match?.[1];

      if (error?.name === "validation_error" && allowedEmail) {
        console.log(`🔁 Falling back to allowed test email: ${allowedEmail}`);
        const { data: fallbackData, error: fallbackError } = await resend.emails.send({
          from: 'Amazon Alerts <onboarding@resend.dev>',
          to: [allowedEmail],
          subject: `📨 Sample Alert: ${accountName} Performance Notification (routed)`,
          html: emailHtml.replace('</body>', `<div style="margin-top:16px;color:#6b7280;font-size:12px;">Routed to ${allowedEmail} due to Resend domain limits. Intended recipient: ${clientEmail}</div></body>`),
        });

        if (fallbackError) {
          console.error("❌ Fallback send failed:", fallbackError);
          throw fallbackError;
        }

        console.log(`✅ Sample alert email routed to ${allowedEmail}`);

        return new Response(
          JSON.stringify({ 
            success: true,
            message: "Sample notification routed to your verified email due to domain limits",
            emailId: fallbackData?.id,
            routedTo: allowedEmail,
            intendedRecipient: clientEmail
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      throw error;
    }

  } catch (error: any) {
    console.error("❌ Error in sample client alert handler:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send sample notification"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
