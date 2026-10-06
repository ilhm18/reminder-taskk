import nodemailer from "npm:nodemailer@7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://wlxfjilmfjpgmeshznab.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? "465");
const SMTP_USER = Deno.env.get("SMTP_USER") ?? "adminremindtask@gmail.com";
const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD") || Deno.env.get("SMTP_PASS") ?? "rtftwdjjhmwtyvyq";
const SMTP_FROM_EMAIL = Deno.env.get("SMTP_FROM_EMAIL") || SMTP_USER;
const SMTP_FROM_NAME = Deno.env.get("SMTP_FROM_NAME") || "RemindTask Notification";
const APP_URL = Deno.env.get("APP_URL") || "https://remindtask.my.id";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD.replace(/\s+/g, ''),
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const isRealEmail = (email: unknown): email is string => {
  if (typeof email !== "string") return false;
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  if (value.endsWith(".local")) return false;
  if (value.endsWith("@siswa.com")) return false;
  if (value.endsWith("@admin.com")) return false;
  if (value.endsWith("@remindtask.com")) return false;
  if (value.includes("remindtask.local")) return false;
  if (value.includes("siswa.remindtask.com")) return false;
  return true;
};

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const textToHtml = (value: unknown): string =>
  escapeHtml(value).replace(/\r?\n/g, "<br>");

const formatWIB = (value?: string | number | Date) => {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date) + " WIB";
};

type MailInput = {
  to: string;
  subject: string;
  html: string;
  category?: string;
};

async function sendMail(mail: MailInput) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM_EMAIL) {
    throw new Error("SMTP Supabase belum dikonfigurasi.");
  }
  if (!isRealEmail(mail.to)) throw new Error("Alamat email tujuan tidak valid.");

  return await transporter.sendMail({
    from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = await req.json();
    if (body.action === 'health-check') {
      return new Response(JSON.stringify({ success: true, message: 'SMTP Edge Function is active.' }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = await sendMail({
      to: body.email || body.to,
      subject: body.title || body.subject || 'RemindTask Notification',
      html: body.html || body.message || '',
    });
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
