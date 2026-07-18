# Security operations

## Cloudflare email alert

The application deliberately does not send security alerts directly to an arbitrary email address. That would require an authenticated email provider and would create another outbound attack surface. Configure the alert at the Cloudflare edge instead:

1. In Cloudflare, confirm that the production hostname is **proxied** (orange cloud).
2. Open **Notifications**, select **Add**, choose **WAF / Security Events Alert**, and scope it to this zone.
3. Set the destination to `franciscoariellopez22@gmail.com`, filter for the **Block** action where the plan permits it, and save the policy.
4. Review **Security > Events** whenever an alert arrives; retain evidence before changing a rule.

Cloudflare email notifications are available on Free plans, while WAF security-event spike alerts are available on Business and Enterprise. Such alerts are anomaly notifications, not one email per blocked request: Cloudflare evaluates five-minute buckets and applies a threshold and baseline calculation. Keep Cloudflare account recovery and MFA enabled, and verify that `noreply@notify.cloudflare.com` is not filtered by Gmail.

## Application controls

- Public research uses a fixed provider, strict request/response size limits, timeouts, concurrency limits, and no user-supplied URL fetching.
- Private routes require authenticated authorization, same-site browser writes, bounded JSON bodies, per-user rate limits, bounded rate-limit memory, and a global active-run limit.
- Private model runs use a fixed endpoint, server-only credentials, fixed tool-free requests, a bounded provider response, and a maximum of three parallel specialist calls.
- The internal catalog generator accepts only a size-bounded local `.xlsx` file and uses a maintained parser; its output is data, never executable spreadsheet content.
- Security headers are emitted by both the standalone Next deployment and the Cloudflare Worker.

These controls reduce abuse and impact; they do not make an internet service impossible to attack. Cloudflare WAF, DDoS protection, bot controls, logs, alerts, dependency updates, and periodic review remain required operational controls.
