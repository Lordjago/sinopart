/**
 * Shared email shell + helpers
 * ---------------------------------------------------------------------------
 * Email clients are not browsers: Outlook renders with Word's engine, Gmail
 * strips <style> blocks in some contexts, and flexbox/grid are unreliable. So
 * this is deliberately old-fashioned. Tables for layout, inline styles, a fixed
 * 600px content column, and web-safe font stacks.
 *
 * Every template supplies only its body; the header, footer and wrapper come
 * from here so every email looks like one product.
 */

const BRAND = {
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  accent: '#c2410c',
  line: '#e2e8f0',
  panel: '#f8fafc',
  page: '#f1f5f9',
};

/**
 * Escapes a value before it goes into HTML.
 *
 * Every interpolated value in these templates is user-submitted, names,
 * cities, dealership names, WhatsApp numbers. Without this, someone can put
 * markup or a phishing link into an email that looks like it came from us.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Wraps a body fragment in the branded shell.
 *
 * `preheader` is the grey line inboxes show next to the subject. It is hidden
 * in the body itself; without one, clients pull the first visible text, which
 * is usually the header and reads badly.
 */
export function layout(options: {
  title: string;
  preheader: string;
  body: string;
}): string {
  const { title, preheader, body } = options;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.page};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(preheader)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                 style="width:100%;max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid ${BRAND.line};font-family:Arial,Helvetica,sans-serif;">

            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid ${BRAND.line};">
                <span style="font-size:19px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.02em;">
                  SinoPart
                </span>
              </td>
            </tr>

            <tr>
              <td style="padding:32px;color:${BRAND.body};font-size:15px;line-height:1.65;">
                ${body}
              </td>
            </tr>

            <tr>
              <td style="padding:20px 32px;background:${BRAND.panel};border-top:1px solid ${BRAND.line};color:${BRAND.muted};font-size:12px;line-height:1.6;">
                You are receiving this because you contacted SinoPart or signed up
                on our website.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${BRAND.ink};font-weight:700;">${escapeHtml(text)}</h1>`;
}

export function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;color:${BRAND.body};font-size:15px;line-height:1.65;">${html}</p>`;
}

export { BRAND };
