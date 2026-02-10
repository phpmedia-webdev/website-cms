import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";

/** Defaults from Anychat admin embed snippet; override with env for production. */
const DEFAULT_WIDGET_ID = "7bdc8416-3423-3321-89bf-f3bc63c969c7";
const DEFAULT_API_KEY = "Jdh4GQhA4j66khdwjaUc9A";
const DEFAULT_MODULE_CONFIG_URL = "https://chat.phpmedia.com/app";

/**
 * GET /api/crm/omnichat/config
 * Returns Anychat admin widget config for the OmniChat page. Admin auth required.
 * Keeps apiKey server-side; client receives it only when authenticated.
 *
 * Env vars (optional): ANYCHAT_OMNICHAT_WIDGET_ID, ANYCHAT_OMNICHAT_API_KEY, ANYCHAT_OMNICHAT_MODULE_CONFIG_URL
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const widgetId =
      process.env.ANYCHAT_OMNICHAT_WIDGET_ID ?? DEFAULT_WIDGET_ID;
    const apiKey = process.env.ANYCHAT_OMNICHAT_API_KEY ?? DEFAULT_API_KEY;
    const moduleConfigUrl =
      process.env.ANYCHAT_OMNICHAT_MODULE_CONFIG_URL ?? DEFAULT_MODULE_CONFIG_URL;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "OmniChat not configured",
          hint: "Set ANYCHAT_OMNICHAT_API_KEY in environment.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      widgetId,
      apiKey,
      moduleConfigUrl,
    });
  } catch (error) {
    console.error("OmniChat config error:", error);
    return NextResponse.json(
      { error: "Failed to load OmniChat config" },
      { status: 500 }
    );
  }
}
