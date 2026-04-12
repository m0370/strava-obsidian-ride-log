/**
 * Strava OAuth2 authentication — token management.
 * Credentials: STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET in ~/.config/env/global.env
 * Token storage: data/token.json (gitignored)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const SKILL_DIR = join(import.meta.dir, "..");
const TOKEN_FILE = join(SKILL_DIR, "data/token.json");
const GLOBAL_ENV = `${process.env.HOME}/.config/env/global.env`;
const CALLBACK_PORT = 8888;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;

interface Credentials {
  clientId: string;
  clientSecret: string;
}

interface Token {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete_id: number;
  athlete_name: string;
}

function getCredentials(): Credentials {
  if (process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET) {
    return {
      clientId: process.env.STRAVA_CLIENT_ID,
      clientSecret: process.env.STRAVA_CLIENT_SECRET,
    };
  }

  try {
    const envFile = readFileSync(GLOBAL_ENV, "utf-8");
    const idMatch = envFile.match(/STRAVA_CLIENT_ID=["']?([^"'\n]+)/);
    const secretMatch = envFile.match(/STRAVA_CLIENT_SECRET=["']?([^"'\n]+)/);
    if (idMatch && secretMatch) {
      return { clientId: idMatch[1].trim(), clientSecret: secretMatch[1].trim() };
    }
  } catch {}

  throw new Error(
    "STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET が見つかりません。\n" +
    "~/.config/env/global.env に追記してから再実行してください:\n" +
    "  STRAVA_CLIENT_ID=xxxxxxx\n" +
    "  STRAVA_CLIENT_SECRET=xxxxxxxxxxxxxxxx"
  );
}

function loadToken(): Token | null {
  try {
    if (existsSync(TOKEN_FILE)) {
      return JSON.parse(readFileSync(TOKEN_FILE, "utf-8")) as Token;
    }
  } catch {}
  return null;
}

function saveToken(token: Token): void {
  writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2), "utf-8");
}

async function refreshAccessToken(creds: Credentials, refreshToken: string): Promise<Token> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`トークンリフレッシュ失敗: ${await res.text()}`);
  }

  const data = await res.json() as any;
  const token: Token = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete_id: data.athlete?.id || 0,
    athlete_name: `${data.athlete?.firstname || ""} ${data.athlete?.lastname || ""}`.trim(),
  };
  saveToken(token);
  return token;
}

export async function getAccessToken(): Promise<string> {
  const creds = getCredentials();
  const token = loadToken();

  if (!token) {
    throw new Error("未認証。先に実行してください: bun run strava.ts auth");
  }

  // 5分以内に期限切れなら自動リフレッシュ
  if (Date.now() / 1000 > token.expires_at - 300) {
    console.error("アクセストークンをリフレッシュ中...");
    const refreshed = await refreshAccessToken(creds, token.refresh_token);
    return refreshed.access_token;
  }

  return token.access_token;
}

export async function runAuthFlow(): Promise<void> {
  const creds = getCredentials();

  const authUrl =
    `https://www.strava.com/oauth/authorize?client_id=${creds.clientId}` +
    `&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&approval_prompt=force&scope=read,activity:read_all`;

  console.log("ブラウザでStrava認証ページを開きます...");
  const { execSync } = await import("child_process");
  execSync(`open "${authUrl}"`);

  console.log(`ポート${CALLBACK_PORT}でコールバック待機中...`);

  const code = await new Promise<string>((resolve, reject) => {
    const server = Bun.serve({
      port: CALLBACK_PORT,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/callback") {
          const code = url.searchParams.get("code");
          const error = url.searchParams.get("error");
          if (error) {
            reject(new Error(`OAuth エラー: ${error}`));
            setTimeout(() => server.stop(), 100);
            return new Response("認証失敗。このタブを閉じてください。", { status: 400 });
          }
          if (code) {
            resolve(code);
            setTimeout(() => server.stop(), 100);
            return new Response("認証成功！このタブを閉じてください。", { status: 200 });
          }
        }
        return new Response("Not found", { status: 404 });
      },
    });
  });

  // 認証コードをトークンに交換
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`トークン交換失敗: ${await res.text()}`);
  }

  const data = await res.json() as any;
  const token: Token = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete_id: data.athlete?.id || 0,
    athlete_name: `${data.athlete?.firstname || ""} ${data.athlete?.lastname || ""}`.trim(),
  };
  saveToken(token);

  console.log(`\n認証完了: ${token.athlete_name} (ID: ${token.athlete_id})`);
  console.log("トークンを data/token.json に保存しました。");
}
