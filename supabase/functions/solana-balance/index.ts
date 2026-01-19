import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallback public RPCs for when primary hits rate limits
const FALLBACK_RPCS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-mainnet.g.alchemy.com/v2/demo",
  "https://rpc.ankr.com/solana",
  "https://solana.public-rpc.com",
];

interface BalanceRequest {
  publicKey: string;
}

async function getBalanceLamports(rpcUrl: string, publicKey: string): Promise<number> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getBalance",
      params: [publicKey],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`RPC error ${response.status}: ${text.slice(0, 120)}`);
  }

  const data = await response.json();
  if (data?.error) {
    // Check for rate limit error
    if (data.error?.code === -32429 || data.error?.message?.includes("max usage")) {
      throw new Error("RATE_LIMITED");
    }
    throw new Error(data.error?.message || "RPC returned an error");
  }

  const lamports = Number(data?.result?.value ?? 0);
  return Number.isFinite(lamports) ? lamports : 0;
}

async function getBalanceWithFallback(primaryRpc: string, publicKey: string): Promise<number> {
  const rpcsToTry = [primaryRpc, ...FALLBACK_RPCS.filter(r => r !== primaryRpc)];
  
  for (let i = 0; i < rpcsToTry.length; i++) {
    const rpc = rpcsToTry[i];
    try {
      return await getBalanceLamports(rpc, publicKey);
    } catch (error: any) {
      const isRateLimit = error.message === "RATE_LIMITED" || error.message?.includes("429");
      console.log(`[SolanaBalance] RPC ${i + 1}/${rpcsToTry.length} failed: ${error.message}`);
      
      if (i === rpcsToTry.length - 1) {
        throw new Error(isRateLimit ? "All RPCs rate limited" : error.message);
      }
      // Continue to next RPC
    }
  }
  
  throw new Error("No RPC available");
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client to verify the user's JWT
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Extract and verify the JWT token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await adminClient.auth.getUser(token);

    if (authError || !user) {
      console.error("[SolanaBalance] Auth error:", authError?.message || "No user found");
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: BalanceRequest = await req.json().catch(() => ({ publicKey: "" }));
    if (!body.publicKey || typeof body.publicKey !== "string") {
      return new Response(JSON.stringify({ error: "Missing required field: publicKey" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";

    let rpcHost = "unknown";
    try {
      rpcHost = new URL(rpcUrl).host;
    } catch {
      rpcHost = rpcUrl.slice(0, 32);
    }

    console.log(`[SolanaBalance] user=${user.id} rpcHost=${rpcHost}`);

    const balanceLamports = await getBalanceWithFallback(rpcUrl, body.publicKey);
    const balanceSol = balanceLamports / 1e9;

    return new Response(
      JSON.stringify({
        success: true,
        publicKey: body.publicKey,
        balanceLamports,
        balanceSol,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[SolanaBalance] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
