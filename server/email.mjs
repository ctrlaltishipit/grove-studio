// =============================================================================
// GroveStudio server — SMTP email (nodemailer).
//
// Configured entirely from env; until the SMTP_* vars are filled in,
// emailConfigured() is false and the invite flow still works (it adds
// existing members and returns the code to share by hand) — it just doesn't
// send mail. The user verifies SMTP later; nothing else waits on it.
// =============================================================================

import nodemailer from 'nodemailer';

const HOST = process.env.SMTP_HOST;
const PORT = Number(process.env.SMTP_PORT || 587);
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;
// SMTP_SECURE: "true" for implicit TLS (port 465); otherwise STARTTLS.
const SECURE = String(process.env.SMTP_SECURE ?? (PORT === 465)).toLowerCase() === 'true';
const FROM = process.env.SMTP_FROM || (USER ? `GroveStudio <${USER}>` : 'GroveStudio <no-reply@grovestudio.app>');

export function emailConfigured() {
  return Boolean(HOST && USER && PASS);
}

let _transport = null;
function transport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: SECURE,
      auth: { user: USER, pass: PASS },
    });
  }
  return _transport;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
));

function inviteHtml({ inviterName, spaceName, code, joinUrl }) {
  const who = esc(inviterName) || 'Someone';
  const space = esc(spaceName) || 'a space';
  return `<!doctype html><html><body style="margin:0;background:#F7F6F2;font-family:'Helvetica Neue',Arial,sans-serif;color:#1B1A17">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6F2;padding:32px 0">
    <tr><td align="center">
      <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E8E4DB;border-radius:16px;overflow:hidden">
        <tr><td style="padding:26px 28px 8px">
          <div style="font-size:17px;font-weight:700;letter-spacing:-0.01em">Grove<span style="color:#2E5C3A">Studio</span></div>
        </td></tr>
        <tr><td style="padding:8px 28px 4px">
          <div style="font-size:21px;font-weight:600;line-height:1.3">${who} invited you to<br>&ldquo;${space}&rdquo;</div>
        </td></tr>
        <tr><td style="padding:8px 28px 0">
          <p style="margin:0;font-size:14.5px;line-height:1.6;color:#6E6A5F">
            Join the space to read and write shared notes together — live, like a doc — and see the board of who's doing what.
          </p>
        </td></tr>
        <tr><td style="padding:22px 28px 6px">
          <a href="${esc(joinUrl)}" style="display:inline-block;background:#3F7A4F;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:99px">Open GroveStudio &amp; join</a>
        </td></tr>
        <tr><td style="padding:16px 28px 4px">
          <div style="font-size:12px;color:#9C968A;text-transform:uppercase;letter-spacing:.06em">Or join with this code</div>
          <div style="font-family:'Courier New',monospace;font-size:26px;font-weight:700;letter-spacing:.28em;color:#1B1A17;margin-top:6px">${esc(code)}</div>
        </td></tr>
        <tr><td style="padding:18px 28px 26px">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#9C968A">
            No account yet? Opening the link lets you sign in with Google or as a guest, then the code drops you straight into the space.
          </p>
        </td></tr>
      </table>
      <div style="font-size:11px;color:#9C968A;margin-top:14px">You received this because ${who} invited you on GroveStudio.</div>
    </td></tr>
  </table>
</body></html>`;
}

function inviteText({ inviterName, spaceName, code, joinUrl }) {
  return [
    `${inviterName || 'Someone'} invited you to "${spaceName || 'a space'}" on GroveStudio.`,
    '',
    `Join here: ${joinUrl}`,
    `Or use this code once you're signed in: ${code}`,
    '',
    'No account yet? The link lets you sign in with Google or as a guest, then the code drops you into the space.',
  ].join('\n');
}

// Exposed for previewing the template without sending.
export function renderInviteEmail(args) {
  return { subject: `${args.inviterName || 'Someone'} invited you to "${args.spaceName || 'a space'}" on GroveStudio`, html: inviteHtml(args), text: inviteText(args) };
}

export async function sendInviteEmail({ to, inviterName, spaceName, code, joinUrl }) {
  if (!emailConfigured()) throw new Error('SMTP is not configured');
  return transport().sendMail({
    from: FROM,
    to,
    subject: `${inviterName || 'Someone'} invited you to "${spaceName || 'a space'}" on GroveStudio`,
    text: inviteText({ inviterName, spaceName, code, joinUrl }),
    html: inviteHtml({ inviterName, spaceName, code, joinUrl }),
  });
}

// ---- share selected notes ----------------------------------------------------

function notesHtml({ sharerName, spaceName, notes, appUrl }) {
  const who = esc(sharerName) || 'Someone';
  const items = notes.map((n) => `
        <tr><td style="padding:14px 28px 4px">
          <div style="font-size:16px;font-weight:600;line-height:1.35">${esc(n.title)}</div>
        </td></tr>
        <tr><td style="padding:4px 28px 14px">
          <div style="font-size:14px;line-height:1.65;color:#3C3A34;white-space:pre-wrap">${esc(n.body || '(empty note)')}</div>
        </td></tr>
        <tr><td style="padding:0 28px"><div style="height:1px;background:#E8E4DB"></div></td></tr>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#F7F6F2;font-family:'Helvetica Neue',Arial,sans-serif;color:#1B1A17">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6F2;padding:32px 0">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E8E4DB;border-radius:16px;overflow:hidden">
        <tr><td style="padding:26px 28px 8px">
          <div style="font-size:17px;font-weight:700;letter-spacing:-0.01em">Grove<span style="color:#2E5C3A">Studio</span></div>
        </td></tr>
        <tr><td style="padding:8px 28px 12px">
          <div style="font-size:20px;font-weight:600;line-height:1.3">${who} shared ${notes.length} note${notes.length === 1 ? '' : 's'} from<br>&ldquo;${esc(spaceName)}&rdquo;</div>
        </td></tr>
        <tr><td style="padding:0 28px"><div style="height:1px;background:#E8E4DB"></div></td></tr>
        ${items}
        <tr><td style="padding:18px 28px 26px">
          <a href="${esc(appUrl)}/app" style="display:inline-block;background:#3F7A4F;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:99px">Open GroveStudio</a>
        </td></tr>
      </table>
      <div style="font-size:11px;color:#9C968A;margin-top:14px">You received this because ${who} shared notes with you on GroveStudio.</div>
    </td></tr>
  </table>
</body></html>`;
}

function notesText({ sharerName, spaceName, notes, appUrl }) {
  return [
    `${sharerName || 'Someone'} shared ${notes.length} note${notes.length === 1 ? '' : 's'} from "${spaceName}" on GroveStudio.`,
    '',
    ...notes.flatMap((n) => [`## ${n.title}`, n.body || '(empty note)', '']),
    `Open GroveStudio: ${appUrl}/app`,
  ].join('\n');
}

export async function sendNotesEmail({ to, sharerName, spaceName, notes, appUrl }) {
  if (!emailConfigured()) throw new Error('SMTP is not configured');
  return transport().sendMail({
    from: FROM,
    to,
    subject: `${sharerName || 'Someone'} shared ${notes.length} note${notes.length === 1 ? '' : 's'} from "${spaceName}" on GroveStudio`,
    text: notesText({ sharerName, spaceName, notes, appUrl }),
    html: notesHtml({ sharerName, spaceName, notes, appUrl }),
  });
}
