export function generateUUID(): string {
  return crypto.randomUUID();
}

export function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

export function now(): number {
  return Math.floor(Date.now() / 1000);
}

export async function sendInviteEmail(
  resendApiKey: string,
  appUrl: string,
  toEmail: string,
  inviteId: string,
  familyName: string,
  inviterName: string
): Promise<void> {
  const inviteUrl = `${appUrl}/join?token=${inviteId}`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FamilyCart <onboarding@resend.dev>',
      to: [toEmail],
      subject: `You've been invited to join ${familyName} on FamilyCart`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #16a34a; margin-bottom: 8px;">FamilyCart</h1>
          <p style="color: #374151; font-size: 16px;">
            <strong>${inviterName}</strong> has invited you to join <strong>${familyName}</strong> on FamilyCart — a collaborative shopping list app for families.
          </p>
          <div style="margin: 32px 0;">
            <a href="${inviteUrl}"
               style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This invitation expires in 48 hours. If you weren't expecting this email, you can safely ignore it.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
            FamilyCart · Powered by Cloudflare
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send invite email: ${response.status} ${body}`);
  }
}

export async function notifyDO(
  listDO: DurableObjectNamespace,
  listId: string,
  message: object
): Promise<void> {
  try {
    const id = listDO.idFromName(listId);
    const stub = listDO.get(id);
    await stub.fetch('http://do/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch {
    // Non-critical: real-time update failed, clients will poll
  }
}
