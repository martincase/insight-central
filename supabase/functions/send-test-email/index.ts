import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("📧 Test email handler started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const testEmails = ["hello@martincase.co.uk", "gemma@martincase.co.uk"];
    
    const emailHtml = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .test-section { margin: 20px 0; padding: 15px; border-left: 4px solid #10b981; background: #f0fdf4; }
            .footer { margin-top: 30px; padding: 20px; background: #f9fafb; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✅ Test Alert Email</h1>
            <p>Amazon Dashboard Alert System Test</p>
          </div>
          
          <div class="content">
            <div class="test-section">
              <h2>🧪 Test Email Successfully Delivered</h2>
              <p>This is a test email from your Amazon Dashboard alert system.</p>
              <p><strong>System Status:</strong> ✅ All systems operational</p>
              <p><strong>Email Configuration:</strong> ✅ Working correctly</p>
              
              <h3>Sample Alert Preview:</h3>
              <div style="margin: 15px 0; padding: 10px; background: white; border-radius: 4px; border-left: 4px solid #dc2626;">
                <strong>TestAccount-UK</strong> - Data Gap Alert
                <br><em>No data received for 8 hours - last update: 2024-08-31 02:00:00 UTC</em>
                <div style="color: #666; font-size: 0.9em;">Detected: ${new Date().toLocaleString()}</div>
              </div>
              
              <div style="margin: 15px 0; padding: 10px; background: white; border-radius: 4px; border-left: 4px solid #f59e0b;">
                <strong>TestAccount-US</strong> - Sales Performance 📉
                <br><em>Sales dropped significantly: -15.2% compared to yesterday</em>
                <br>Change: -15.2%
                <div style="color: #666; font-size: 0.9em;">Detected: ${new Date().toLocaleString()}</div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>✅ Email Alert System Test Completed Successfully</strong></p>
            <p>You will receive real alerts when issues are detected with your Amazon accounts.</p>
            <p><small>Test sent at ${new Date().toLocaleString()}</small></p>
          </div>
        </body>
      </html>
    `;

    // Send test emails
    const emailPromises = testEmails.map(async (email) => {
      return resend.emails.send({
        from: "Amazon Dashboard Test <alerts@resend.dev>",
        to: [email],
        subject: "✅ Test Alert - Amazon Dashboard Email System",
        html: emailHtml,
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);
    
    // Log results
    const successCount = emailResults.filter(result => result.status === "fulfilled").length;
    const failureCount = emailResults.filter(result => result.status === "rejected").length;
    
    emailResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log(`✅ Test email sent successfully to ${testEmails[index]}`);
      } else {
        console.error(`❌ Failed to send test email to ${testEmails[index]}:`, result.reason);
      }
    });

    console.log(`📧 Test email batch completed: ${successCount} successful, ${failureCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: "Test emails sent",
        successful: successCount,
        failed: failureCount,
        recipients: testEmails
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("❌ Error in test email handler:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);