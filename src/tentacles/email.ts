import nodemailer from "nodemailer";
import { config } from "../config/keys.js";

// ── Result type 
export interface EmailResult {
  success: boolean;
  output: string;
  message: string;
}

// ── Email params 
export interface EmailParams {
  to: string;
  subject: string;
  body: string;
}

// ── Validate email address 
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Create transporter 
function createTransporter() {
  const { user, appPassword } = config.gmail;

  if (!user || !appPassword) {
    throw new Error(
      "Gmail credentials missing. Add GMAIL_USER and GMAIL_APP_PASSWORD to your .env file.",
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass: appPassword,
    },
  });
}

// ── Send email 
export async function executeEmail(
  params: Record<string, string>,
): Promise<EmailResult> {
  const { to, subject, body } = params;

  // Validate required fields
  if (!to) {
    return {
      success: false,
      output: "",
      message: "No recipient email address provided.",
    };
  }

  if (!isValidEmail(to)) {
    return {
      success: false,
      output: "",
      message: `Invalid email address: ${to}`,
    };
  }

  if (!subject) {
    return {
      success: false,
      output: "",
      message: "No email subject provided.",
    };
  }

  if (!body) {
    return {
      success: false,
      output: "",
      message: "No email body provided.",
    };
  }

  // Check Gmail credentials exist
  if (!config.gmail.user || !config.gmail.appPassword) {
    return {
      success: false,
      output: "",
      message:
        "Gmail not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to your .env file.",
    };
  }

  try {
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: `"Octopus Agent" <${config.gmail.user}>`,
      to,
      subject,
      text: body,
      html: `<pre style="font-family: sans-serif; white-space: pre-wrap;">${body}</pre>`,
    });

    return {
      success: true,
      output: `Message ID: ${info.messageId}\nFrom: ${config.gmail.user}\nTo: ${to}\nSubject: ${subject}`,
      message: `Email sent to ${to}`,
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      success: false,
      output: "",
      message: `Failed to send email: ${error.message ?? "unknown error"}`,
    };
  }
}
