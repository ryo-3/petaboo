import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface TeamInvitationEmailData {
  to: string;
  teamName: string;
  inviterEmail: string;
  role: 'admin' | 'member';
  invitationToken: string;
  invitationLink: string;
}

export async function sendTeamInvitationEmail(data: TeamInvitationEmailData) {
  const { to, teamName, inviterEmail, role, invitationLink } = data;

  const roleText = role === 'admin' ? '管理者' : 'メンバー';

  try {
    console.log('Resend送信開始:', { to, teamName, role });
    
    const emailResult = await resend.emails.send({
      from: 'onboarding@resend.dev', // Resendのテストドメイン（最初はこれでOK）
      to,
      subject: `${teamName} チームへの招待`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center;">
            <h1 style="color: #333; margin-bottom: 20px;">チーム招待</h1>
            <p style="color: #666; font-size: 18px; margin-bottom: 30px;">
              <strong>${inviterEmail}</strong> さんから<br>
              「<strong>${teamName}</strong>」チームに招待されました
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
              <p style="color: #333; margin: 0;">
                役割: <strong style="color: #2563eb;">${roleText}</strong>
              </p>
            </div>
            
            <a href="${invitationLink}" 
               style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 16px;">
              チームに参加する
            </a>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              この招待は7日間有効です。<br>
              このメールに心当たりがない場合は、無視してください。
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>このメールは自動送信されています。返信しないでください。</p>
          </div>
        </div>
      `,
      text: `
${teamName} チームへの招待

${inviterEmail} さんから「${teamName}」チームに${roleText}として招待されました。

以下のリンクからチームに参加できます：
${invitationLink}

この招待は7日間有効です。
このメールに心当たりがない場合は、無視してください。
      `.trim()
    });

    console.log('Resend完全な応答:', JSON.stringify(emailResult, null, 2));
    console.log('招待メール送信成功:', {
      emailId: emailResult.data?.id,
      to,
      teamName,
      error: emailResult.error
    });

    return {
      success: true,
      emailId: emailResult.data?.id
    };

  } catch (error) {
    console.error('招待メール送信エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'メール送信に失敗しました'
    };
  }
}