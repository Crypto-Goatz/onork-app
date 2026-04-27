/**
 * Welcome Email Template
 *
 * Generates a branded HTML welcome email for new 0nCore signups.
 * Dark theme matching the app's design system.
 */

export function generateWelcomeEmail(name: string, token: string): string {
  const firstName = (name || 'there').split(/\s+/)[0]
  const dashboardUrl = 'https://0ncore.com/dashboard'
  const extensionUrl = 'https://0ncore.com/dashboard/integrations'
  const automationsUrl = 'https://0ncore.com/dashboard/automations'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to 0nCore</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f0f4f8;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0d1117;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <span style="font-size: 28px; font-weight: 800; color: #6EE05A; letter-spacing: -0.5px;">0nCore</span>
            </td>
          </tr>

          <!-- Welcome Card -->
          <tr>
            <td style="background-color: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 40px 32px;">

              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #f0f4f8;">
                Welcome, ${firstName}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #9ca3af;">
                Your AI command center is live. 1,554 tools across 96 services are ready to run your business on autopilot.
              </p>

              <!-- Token Block -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td style="background-color: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 16px 20px;">
                    <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: 600;">
                      Your API Token
                    </p>
                    <code style="font-size: 14px; font-family: 'Roboto Mono', 'SF Mono', Monaco, Consolas, monospace; color: #6EE05A; word-break: break-all;">
                      ${token}
                    </code>
                  </td>
                </tr>
              </table>

              <!-- Quick Start Links -->
              <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">
                Quick Start
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #30363d;">
                    <a href="${dashboardUrl}" style="color: #6EE05A; text-decoration: none; font-size: 14px; font-weight: 500;">
                      Open your Dashboard &rarr;
                    </a>
                    <br />
                    <span style="font-size: 13px; color: #6b7280;">
                      See your CRM, contacts, automations, and analytics
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #30363d;">
                    <a href="${extensionUrl}" style="color: #6EE05A; text-decoration: none; font-size: 14px; font-weight: 500;">
                      Install Chrome Extension &rarr;
                    </a>
                    <br />
                    <span style="font-size: 13px; color: #6b7280;">
                      AI sidebar on every tab with VPIS scoring
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <a href="${automationsUrl}" style="color: #6EE05A; text-decoration: none; font-size: 14px; font-weight: 500;">
                      Build your first Automation &rarr;
                    </a>
                    <br />
                    <span style="font-size: 13px; color: #6b7280;">
                      Drag, drop, or describe what you want automated
                    </span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background-color: #6EE05A; color: #0d1117; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 8px;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 16px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280;">
                0nCore by RocketOpp LLC &middot; AI That Runs Your Business
              </p>
              <p style="margin: 0; font-size: 11px; color: #484f58;">
                You received this because you signed up at 0ncore.com.
                <br />
                RocketOpp LLC &middot; Pittsburgh, PA &middot; USA
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
