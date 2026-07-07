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

// ── Blueprint 邮件设计令牌（与落地页一致的暖色工程纸美学）──────────────────
// 邮件 HTML 限制：table 布局 + inline 样式；网格背景用渐变，剥离它的客户端回退纯色。
const C = {
  canvas: '#f7f4ef',
  surface: '#ffffff',
  ink: '#2e2a26',
  inkSoft: '#8a8178',
  inkFaint: '#b5aea4',
  hairline: '#d8d2c8',
  border: '#c4bcae',
};
const MONO = "Consolas, 'SF Mono', Menlo, 'Liberation Mono', monospace";
const SANS = "-apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
// 工程纸网格：32px 主格暖炭黑细线，支持的客户端显示，其余回退 canvas 纯色。
const GRID =
  'repeating-linear-gradient(#ece7e0 0 1px, transparent 1px 32px),' +
  'repeating-linear-gradient(90deg, #ece7e0 0 1px, transparent 1px 32px)';


// 角节点（蓝图图纸钉）：卡片四角的小方块。
function cornerNode(top: boolean, left: boolean): string {
  const v = top ? 'top:-4px;' : 'bottom:-4px;';
  const h = left ? 'left:-4px;' : 'right:-4px;';
  return `<span style="position:absolute;${v}${h}width:7px;height:7px;background:${C.surface};border:1px solid ${C.border};"></span>`;
}

// OTP 6 格分隔显示（呼应登录页 InputOTP）。
function otpCells(otp: string): string {
  const cells = otp
    .split('')
    .map(
      (d) =>
        `<td style="width:40px;height:48px;text-align:center;vertical-align:middle;` +
        `border:1px solid ${C.border};background:${C.canvas};` +
        `font-family:${MONO};font-size:24px;font-weight:bold;color:${C.ink};">${d}</td>`,
    )
    .join(`<td style="width:6px;"></td>`);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>${cells}</tr></table>`;
}

// Blueprint 邮件外壳：工程纸网格底 + 方角图纸面板 + 品牌头 + 角节点。
function shell(opts: { tag: string; title: string; body: string }): string {
  return `<!DOCTYPE html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${opts.title}</title></head>
<body style="margin:0;padding:0;background:${C.canvas};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.canvas};background-image:${GRID};">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:460px;">
<tr><td style="position:relative;background:${C.surface};border:1px solid ${C.border};padding:32px;">
${cornerNode(true, true)}${cornerNode(true, false)}${cornerNode(false, true)}${cornerNode(false, false)}
<span style="position:absolute;top:10px;right:12px;font-family:${MONO};font-size:9px;letter-spacing:2px;color:${C.inkFaint};">${opts.tag}</span>
<!-- 品牌头 -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="width:40px;height:40px;text-align:center;vertical-align:middle;background:${C.ink};border:1px solid ${C.border};font-family:serif;font-size:18px;font-weight:bold;color:${C.canvas};">茶</td>
<td style="padding-left:12px;">
<div style="font-family:serif;font-size:17px;font-weight:600;color:${C.ink};line-height:1.2;">滴茶</div>
<div style="font-family:${MONO};font-size:10px;letter-spacing:2px;color:${C.inkFaint};text-transform:uppercase;">dicha</div>
</td></tr></table>
<!-- 分隔线 -->
<div style="border-top:1px solid ${C.hairline};margin:24px 0;"></div>
${opts.body}
</td></tr>
<!-- 页脚 -->
<tr><td style="padding:16px 4px;font-family:${MONO};font-size:10px;color:${C.inkFaint};text-align:center;letter-spacing:1px;">
dicha · 滴茶
</td></tr>
</table></td></tr></table></body></html>`;
}

const OTP_SUBJECT: Record<string, string> = {
  'sign-in': '你的 dicha 登录验证码',
  'email-verification': '你的 dicha 邮箱验证码',
  'forget-password': '你的 dicha 密码重置验证码',
};

const OTP_INTRO: Record<string, string> = {
  'sign-in': '使用以下验证码登录 dicha：',
  'email-verification': '使用以下验证码验证你的邮箱：',
  'forget-password': '使用以下验证码重置密码：',
};

const OTP_TAG: Record<string, string> = {
  'sign-in': 'AUTH·OTP',
  'email-verification': 'VERIFY·OTP',
  'forget-password': 'RESET·OTP',
};

/** 渲染 OTP 邮件 HTML（纯函数，便于预览/测试，不触发发送）。 */
export function renderOtpMail(otp: string, type: string): string {
  const intro = OTP_INTRO[type] ?? '你的验证码：';
  const body = `
<p style="margin:0 0 20px;font-family:${SANS};font-size:14px;line-height:1.7;color:${C.ink};">${intro}</p>
${otpCells(otp)}
<p style="margin:20px 0 0;font-family:${MONO};font-size:11px;line-height:1.6;color:${C.inkSoft};">验证码 5 分钟内有效。</p>
<p style="margin:8px 0 0;font-family:${MONO};font-size:11px;line-height:1.6;color:${C.inkFaint};">若非你本人操作，请忽略此邮件。</p>`;
  return shell({ tag: OTP_TAG[type] ?? 'OTP', title: OTP_SUBJECT[type] ?? 'dicha 验证码', body });
}

/** 发送邮箱 OTP 验证码（登录 / 邮箱验证 / 密码重置共用）。 */
export async function sendOtpMail(to: string, otp: string, type: string): Promise<void> {
  await send(to, OTP_SUBJECT[type] ?? '你的 dicha 验证码', renderOtpMail(otp, type));
}
