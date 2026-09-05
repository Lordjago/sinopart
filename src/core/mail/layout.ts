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
 *
 * The tokens below are the brand's, taken from the notification design system
 * the client supplied. Webfonts are named first in each stack but will not
 * load in most clients, so every stack ends in something universally present.
 */

const BRAND = {
  /** Header bar. */
  crimson: '#C8102E',
  /** Page background, and the panel a code sits on. */
  page: '#FBF8F3',
  card: '#FFFFFF',
  line: '#E7DECF',
  /** Headings, and the code itself. */
  ink: '#1A1714',
  body: '#5A5249',
  muted: '#8B8278',
  /** Bullets and other small accents. */
  gold: '#C2912E',
};

const FONT = {
  display: `Archivo,'Helvetica Neue',Arial,sans-serif`,
  body: `Inter,-apple-system,'Segoe UI',Arial,sans-serif`,
  mono: `'IBM Plex Mono','Courier New',Courier,monospace`,
};

/**
 * The wordmark, served from the marketing site.
 *
 * The design mocks pair a small square icon with "SinoPart" set in Archivo,
 * but the asset we actually have in production email is the full wordmark, so
 * it stands alone here rather than repeating the name beside itself.
 */
const LOGO_URL = 'https://getsinopart.com/headerLogo.png';

/**
 * The dealer-facing app. `vendor.getsinopart.com` is the supplier side and
 * `getsinopart.com` is the marketing site, so anything sent to a BUYER links
 * here — browsing included, since a dealer browses inside their own app.
 */
const SITE_URL = 'https://dealer.getsinopart.com';

/** Deep links used by more than one template. */
const LINK = {
  browse: SITE_URL,
  accountSecurity: `${SITE_URL}/account/security`,
  /** The buyer's inspection status page, keyed by the inspection's id. */
  inspection: (id: string) =>
    `${SITE_URL}/inspections/${encodeURIComponent(id)}`,
  /** The buyer's order tracking page, keyed by the order's id. */
  order: (id: string) => `${SITE_URL}/orders/${encodeURIComponent(id)}`,
  /** Where a dealer pays the clearance bill. */
  clearance: (id: string) =>
    `${SITE_URL}/orders/${encodeURIComponent(id)}/clearance`,
};

/**
 * Escapes a value before it goes into HTML.
 *
 * Every interpolated value in these templates is user-submitted, names,
 * cities, dealership names, WhatsApp numbers. Without this, someone can put
 * markup or a phishing link into an email that looks like it came from us.
 *
 * Typed narrowly on purpose. Accepting `unknown` meant an object could be
 * passed by mistake and reach a customer as "[object Object]"; this way the
 * caller has to say what it means by stringifying it.
 */
export function escapeHtml(value: string | number | null | undefined): string {
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
 * is usually the header and reads badly. The padding characters after it stop
 * Gmail from dragging body copy up alongside it.
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
  <body style="margin:0;padding:0;background-color:${BRAND.page};">
    <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:${BRAND.page};">
      ${escapeHtml(preheader)}${'&#8199;&#65279;'.repeat(15)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.page};">
      <tr>
        <td align="center" style="padding:24px 10px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

            <tr>
              <td style="background-color:${BRAND.crimson};padding:18px 32px;">
                <img src="${LOGO_URL}" width="148" height="30" alt="SinoPart" style="display:block;border:0;outline:none;text-decoration:none;height:30px;width:148px;" />
              </td>
            </tr>

            <tr>
              <td style="background-color:${BRAND.card};border-left:1px solid ${BRAND.line};border-right:1px solid ${BRAND.line};border-bottom:1px solid ${BRAND.line};padding:32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${body}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 32px 8px;font-family:${FONT.body};font-size:12px;line-height:20px;color:${BRAND.muted};">
                You are receiving this because you have a SinoPart account.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Body helpers.
 *
 * The shell opens a <table>, so a body fragment is a sequence of <tr>s rather
 * than free-standing block elements. Outlook drops margins on <p> and <h1>, so
 * vertical rhythm is padding on the cell instead.
 */
export function heading(text: string): string {
  return `<tr><td style="font-family:${FONT.display};font-size:26px;line-height:32px;font-weight:700;color:${BRAND.ink};padding-bottom:18px;">${escapeHtml(text)}</td></tr>`;
}

export function paragraph(html: string, gap = 14): string {
  return `<tr><td style="font-family:${FONT.body};font-size:16px;line-height:24px;color:${BRAND.body};padding-bottom:${gap}px;">${html}</td></tr>`;
}

/** A one-time code, set large and widely tracked on its own panel. */
export function codePanel(code: string): string {
  return `<tr><td style="padding-bottom:22px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.page};border:1px solid ${BRAND.line};">
        <tr><td align="center" style="padding:18px;font-family:${FONT.mono};font-size:26px;line-height:32px;font-weight:600;letter-spacing:0.22em;color:${BRAND.ink};">${escapeHtml(code)}</td></tr>
        </table>
      </td></tr>`;
}

/**
 * A cream panel of label/value rows, set in mono so columns line up.
 *
 * Rows with an empty value are dropped rather than printed blank: an email
 * that says "Location —" reads like a broken template, where simply not
 * mentioning location reads like we did not need to.
 */
export function detailPanel(
  rows: Array<[string, string | null | undefined]>,
): string {
  const cells = rows
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(
      ([label, value], i) => `<tr>
              <td width="152" style="width:152px;font-family:${FONT.mono};font-size:13px;line-height:22px;color:${BRAND.muted};vertical-align:top;padding-right:10px;${i ? 'padding-top:6px;' : ''}">${escapeHtml(label)}</td>
              <td style="font-family:${FONT.mono};font-size:13px;line-height:22px;color:${BRAND.ink};vertical-align:top;${i ? 'padding-top:6px;' : ''}">${escapeHtml(value)}</td>
            </tr>`,
    )
    .join('\n            ');

  if (!cells) return '';

  return `<tr><td style="padding-bottom:22px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.page};border:1px solid ${BRAND.line};">
        <tr><td style="padding:16px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${cells}
          </table>
        </td></tr>
        </table>
      </td></tr>`;
}

/**
 * A bulleted list.
 *
 * Tables rather than <ul>, because Outlook and Gmail disagree about list
 * indentation and markers, and in D24 this list is carrying the promise we
 * made about checking the car — it has to look the same everywhere.
 *
 * Items are pre-escaped by the caller, since some of them interpolate values.
 */
export function bullets(items: string[]): string {
  const rows = items
    .map(
      (item) => `<tr>
            <td width="18" style="width:18px;font-family:${FONT.body};font-size:16px;line-height:24px;color:${BRAND.gold};vertical-align:top;">&#8226;</td>
            <td style="font-family:${FONT.body};font-size:16px;line-height:24px;color:${BRAND.body};padding-bottom:4px;">${item}</td>
          </tr>`,
    )
    .join('\n          ');

  return `<tr><td style="padding-bottom:18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${rows}
        </table>
      </td></tr>`;
}

/**
 * A full-width call to action.
 *
 * Outlook ignores padding and background on <a>, so the conditional block
 * draws the same button as a VML rectangle for Word-engine clients; every
 * other client gets the styled anchor. Square corners (`arcsize="0%"`) to
 * match the rest of the brand.
 */
export function button(label: string, href: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);

  return `<tr><td style="padding-bottom:0px;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeHref}" style="height:50px;v-text-anchor:middle;width:534px;" arcsize="0%" stroke="f" fillcolor="${BRAND.crimson}">
        <w:anchorlock/>
        <center style="color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${safeLabel}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-- -->
        <a href="${safeHref}" style="display:block;width:100%;background-color:${BRAND.crimson};color:#FFFFFF;font-family:${FONT.body};font-size:16px;font-weight:600;line-height:50px;height:50px;text-align:center;text-decoration:none;">${safeLabel}</a>
        <!--<![endif]-->
      </td></tr>`;
}

export { BRAND, FONT, LINK, LOGO_URL, SITE_URL };
