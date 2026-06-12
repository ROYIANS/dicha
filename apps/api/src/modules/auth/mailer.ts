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

export async function sendVerificationMail(to: string, url: string): Promise<void> {
  await send(
    to,
    '验证你的 vidorra 邮箱',
    `<p>你好，</p>
     <p>欢迎来到 vidorra。请点击下方链接验证你的邮箱地址：</p>
     <p><a href="${url}">验证邮箱</a></p>
     <p>若你没有注册 vidorra，请忽略此邮件。</p>`,
  );
}

export async function sendResetPasswordMail(to: string, url: string): Promise<void> {
  await send(
    to,
    '重置你的 vidorra 密码',
    `<p>你好，</p>
     <p>我们收到了重置密码的请求。请点击下方链接设置新密码：</p>
     <p><a href="${url}">重置密码</a></p>
     <p>若你没有发起此请求，请忽略此邮件，你的密码不会被更改。</p>`,
  );
}
