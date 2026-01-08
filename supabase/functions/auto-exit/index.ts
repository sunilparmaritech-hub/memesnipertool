import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApiConfig {
  id: string;
  api_type: string;
  api_name: string;
  base_url: string;
  api_key_encrypted: string | null;
  is_enabled: boolean;
}

interface Position {
  id: string;
  user_id: string;
  token_address: string;
  token_symbol: string;
  token_name: string;
  chain: string;
  entry_price: number;
  current_price: number;
  amount: number;
  entry_value: number;
  current_value: number;
  profit_loss_percent: number;
  profit_loss_value: number;
  profit_take_percent: number;
  stop_loss_percent: number;
  status: 'open' | 'closed' | 'pending';
}

interface PriceData {
  address: string;
  price: number;
  priceChange24h?: number;
}

interface ExitResult {
  positionId: string;
  symbol: string;
  action: 'hold' | 'take_profit' | 'stop_loss';
  currentPrice: number;
  profitLossPercent: number;
  executed: boolean;
  txId?: string;
  error?: string;
}

// Fetch current price from external APIs
async function fetchCurrentPrice(
  tokenAddress: string,
  chain: string,
  apiConfigs: ApiConfig[]
): Promise<number | null> {
  // Try DexScreener first
  const dexScreenerConfig = apiConfigs.find(c => c.api_type === 'dexscreener' && c.is_enabled);
  if (dexScreenerConfig) {
    try {
      const response = await fetch(`${dexScreenerConfig.base_url}/latest/dex/tokens/${tokenAddress}`);
      if (response.ok) {
        const data = await response.json();
        const pair = data.pairs?.[0];
        if (pair?.priceUsd) {
          return parseFloat(pair.priceUsd);
        }
      }
    } catch (e) {
      console.error('DexScreener price fetch error:', e);
    }
  }

  // Try GeckoTerminal
  const geckoConfig = apiConfigs.find(c => c.api_type === 'geckoterminal' && c.is_enabled);
  if (geckoConfig) {
    try {
      const networkId = chain === 'solana' ? 'solana' : chain === 'bsc' ? 'bsc' : 'eth';
      const response = await fetch(`${geckoConfig.base_url}/api/v2/networks/${networkId}/tokens/${tokenAddress}`);
      if (response.ok) {
        const data = await response.json();
        if (data.data?.attributes?.price_usd) {
          return parseFloat(data.data.attributes.price_usd);
        }
      }
    } catch (e) {
      console.error('GeckoTerminal price fetch error:', e);
    }
  }

  // Try Birdeye (Solana)
  const birdeyeConfig = apiConfigs.find(c => c.api_type === 'birdeye' && c.is_enabled);
  if (birdeyeConfig && chain === 'solana' && birdeyeConfig.api_key_encrypted) {
    try {
      const response = await fetch(`${birdeyeConfig.base_url}/defi/price?address=${tokenAddress}`, {
        headers: { 'X-API-KEY': birdeyeConfig.api_key_encrypted },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.data?.value) {
          return parseFloat(data.data.value);
        }
      }
    } catch (e) {
      console.error('Birdeye price fetch error:', e);
    }
  }

  return null;
}

// Execute sell via trade execution API
async function executeSell(
  position: Position,
  reason: 'take_profit' | 'stop_loss',
  tradeExecutionConfig: ApiConfig
): Promise<{ success: boolean; txId?: string; error?: string }> {
  try {
    console.log(`Executing SELL for ${position.token_symbol} - Reason: ${reason}`);
    
    const tradePayload = {
      tokenAddress: position.token_address,
      chain: position.chain,
      action: 'sell',
      amount: position.amount,
      slippage: 10, // Higher slippage for exit
      reason,
      positionId: position.id,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (tradeExecutionConfig.api_key_encrypted) {
      headers['Authorization'] = `Bearer ${tradeExecutionConfig.api_key_encrypted}`;
    }

    const response = await fetch(`${tradeExecutionConfig.base_url}/trade/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify(tradePayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Trade API error: ${errorText}` };
    }

    const result = await response.json();
    return { 
      success: true, 
      txId: result.transactionId || result.txId || 'pending',
    };
  } catch (error) {
    console.error('Sell execution error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Sell execution failed',
    };
  }
}

// Check if position should exit
function checkExitConditions(
  position: Position,
  currentPrice: number
): { shouldExit: boolean; reason: 'take_profit' | 'stop_loss' | null; profitLossPercent: number } {
  const profitLossPercent = ((currentPrice - position.entry_price) / position.entry_price) * 100;
  
  // Check take profit
  if (profitLossPercent >= position.profit_take_percent) {
    return { shouldExit: true, reason: 'take_profit', profitLossPercent };
  }
  
  // Check stop loss (negative threshold)
  if (profitLossPercent <= -position.stop_loss_percent) {
    return { shouldExit: true, reason: 'stop_loss', profitLossPercent };
  }
  
  return { shouldExit: false, reason: null, profitLossPercent };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { positionIds, executeExits = false } = body;

    // Fetch API configurations
    const { data: apiConfigs } = await supabase
      .from('api_configurations')
      .select('*')
      .eq('is_enabled', true);

    if (!apiConfigs || apiConfigs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No API configurations found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's open positions
    let positionsQuery = supabase
      .from('positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open');
    
    if (positionIds && positionIds.length > 0) {
      positionsQuery = positionsQuery.in('id', positionIds);
    }

    const { data: positions, error: positionsError } = await positionsQuery;

    if (positionsError) {
      throw new Error('Failed to fetch positions');
    }

    if (!positions || positions.length === 0) {
      return new Response(
        JSON.stringify({ 
          results: [], 
          message: 'No open positions to monitor',
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tradeExecutionConfig = apiConfigs.find((c: ApiConfig) => c.api_type === 'trade_execution');
    const results: ExitResult[] = [];
    const positionUpdates: { id: string; updates: Partial<Position> }[] = [];

    // Process each position
    for (const position of positions as Position[]) {
      // Fetch current price
      const currentPrice = await fetchCurrentPrice(position.token_address, position.chain, apiConfigs);
      
      if (currentPrice === null) {
        results.push({
          positionId: position.id,
          symbol: position.token_symbol,
          action: 'hold',
          currentPrice: position.current_price,
          profitLossPercent: position.profit_loss_percent,
          executed: false,
          error: 'Could not fetch current price',
        });
        continue;
      }

      // Check exit conditions
      const { shouldExit, reason, profitLossPercent } = checkExitConditions(position, currentPrice);
      
      // Calculate P&L
      const currentValue = position.amount * currentPrice;
      const profitLossValue = currentValue - position.entry_value;

      // Update position with current price data
      positionUpdates.push({
        id: position.id,
        updates: {
          current_price: currentPrice,
          current_value: currentValue,
          profit_loss_percent: profitLossPercent,
          profit_loss_value: profitLossValue,
        },
      });

      if (shouldExit && reason) {
        console.log(`Exit triggered for ${position.token_symbol}: ${reason} at ${profitLossPercent.toFixed(2)}%`);
        
        let executed = false;
        let txId: string | undefined;
        let error: string | undefined;

        if (executeExits && tradeExecutionConfig) {
          const sellResult = await executeSell(position, reason, tradeExecutionConfig);
          executed = sellResult.success;
          txId = sellResult.txId;
          error = sellResult.error;

          if (executed) {
            // Update position to closed
            await supabase
              .from('positions')
              .update({
                status: 'closed',
                exit_reason: reason,
                exit_price: currentPrice,
                exit_tx_id: txId,
                closed_at: new Date().toISOString(),
                current_price: currentPrice,
                current_value: currentValue,
                profit_loss_percent: profitLossPercent,
                profit_loss_value: profitLossValue,
              })
              .eq('id', position.id);
          }
        }

        results.push({
          positionId: position.id,
          symbol: position.token_symbol,
          action: reason,
          currentPrice,
          profitLossPercent,
          executed,
          txId,
          error,
        });
      } else {
        results.push({
          positionId: position.id,
          symbol: position.token_symbol,
          action: 'hold',
          currentPrice,
          profitLossPercent,
          executed: false,
        });
      }
    }

    // Batch update positions with latest prices
    for (const { id, updates } of positionUpdates) {
      await supabase.from('positions').update(updates).eq('id', id);
    }

    const exitTriggered = results.filter(r => r.action !== 'hold');
    const executedCount = results.filter(r => r.executed).length;

    console.log(`Auto-exit: Checked ${positions.length} positions, ${exitTriggered.length} exits triggered, ${executedCount} executed`);

    return new Response(
      JSON.stringify({
        results,
        summary: {
          total: positions.length,
          holding: results.filter(r => r.action === 'hold').length,
          takeProfitTriggered: results.filter(r => r.action === 'take_profit').length,
          stopLossTriggered: results.filter(r => r.action === 'stop_loss').length,
          executed: executedCount,
        },
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Auto-exit error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
