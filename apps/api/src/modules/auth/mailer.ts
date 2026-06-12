import nodemailer from 'nodemailer';

// Lazily built SMTP transport (env is validated at boot; read at call time so a
// missing transport never blocks module construction).
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });
}

const OTP_SUBJECT: Record<string, string> = {
  'sign-in': '你的 vidorra 登录验证码',
  'email-verification': '你的 vidorra 邮箱验证码',
  'forget-password': '你的 vidorra 密码重置验证码',
};

const OTP_INTRO: Record<string, string> = {
  'sign-in': '使用以下验证码登录 vidorra：',
  'email-verification': '使用以下验证码验证你的邮箱：',
  'forget-password': '使用以下验证码重置密码：',
};

/** 发送邮箱 OTP 验证码（登录 / 邮箱验证 / 密码重置共用）。 */
export async function sendOtpMail(to: string, otp: string, type: string): Promise<void> {
  await send(
    to,
    OTP_SUBJECT[type] ?? '你的 vidorra 验证码',
    `<p>你好，</p>
     <p>${OTP_INTRO[type] ?? '你的验证码：'}</p>
     <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${otp}</p>
     <p>验证码 5 分钟内有效。若非你本人操作，请忽略此邮件。</p>`,
  );
}
