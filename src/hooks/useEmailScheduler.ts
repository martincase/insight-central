import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  shouldSendEmail,
  captureScreenshot,
  sendScreenshotEmail,
  getEmailJSConfig,
} from "@/utils/screenshotEmailService";
import type { AccountData } from "@/types/dashboard";

export function useEmailScheduler(
  accounts: AccountData[],
  setAccounts: React.Dispatch<React.SetStateAction<AccountData[]>>
) {
  const { toast } = useToast();
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;

  useEffect(() => {
    const checkAndSendEmails = async () => {
      if (!getEmailJSConfig()) return;

      for (const account of accountsRef.current) {
        if (shouldSendEmail(account)) {
          try {
            const screenshot = await captureScreenshot("dashboard-main");
            await sendScreenshotEmail(account, screenshot);

            setAccounts((prev) =>
              prev.map((acc) =>
                acc.id === account.id && acc.emailConfig
                  ? {
                      ...acc,
                      emailConfig: {
                        ...acc.emailConfig,
                        lastSent: new Date().toISOString(),
                      },
                    }
                  : acc
              )
            );

            toast({
              title: "Automated Email Sent",
              description: `Dashboard screenshot sent to ${account.emailConfig?.clientEmail} for ${account.name}`,
            });
          } catch (error) {
            console.error(`Failed to send automated email for ${account.name}:`, error);
          }
        }
      }
    };

    const interval = setInterval(checkAndSendEmails, 60 * 60 * 1000);

    if (accountsRef.current.length > 0) {
      checkAndSendEmails();
    }

    return () => clearInterval(interval);
  }, []); // Run once on mount, uses ref for latest accounts
}
