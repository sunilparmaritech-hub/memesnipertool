import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TokenData {
  address: string;
  name: string;
  symbol: string;
  chain: string;
  liquidity: number;
  liquidityLocked: boolean;
  lockPercentage: number | null;
  buyerPosition: number | null;
  riskScore: number;
  categories: string[];
}

export interface SnipeDecision {
  token: TokenData;
  approved: boolean;
  reasons: string[];
  tradeParams: {
    amount: number;
    slippage: number;
    priority: string;
  } | null;
}

export interface AutoSniperResult {
  decisions: SnipeDecision[];
  executedTrades: { token: string; txId?: string; error?: string }[];
  summary: {
    total: number;
    approved: number;
    rejected: number;
    executed: number;
  };
  settings: {
    minLiquidity: number;
    priority: string;
    categoryFilters: string[];
  };
  timestamp: string;
}

export function useAutoSniper() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AutoSniperResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const evaluateTokens = useCallback(async (
    tokens: TokenData[],
    executeOnApproval: boolean = false
  ): Promise<AutoSniperResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to use the auto-sniper');
      }

      const { data, error: fnError } = await supabase.functions.invoke('auto-sniper', {
        body: { tokens, executeOnApproval },
      });

      if (fnError) throw fnError;

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      
      const approved = data.summary?.approved || 0;
      const executed = data.summary?.executed || 0;
      
      if (executeOnApproval && executed > 0) {
        toast({
          title: 'Trades Executed',
          description: `${executed} trade(s) sent to execution API`,
        });
      } else if (approved > 0) {
        toast({
          title: 'Snipe Opportunities Found',
          description: `${approved} token(s) passed all rules`,
        });
      }

      return data;
    } catch (err: any) {
      const message = err.message || 'Failed to evaluate tokens';
      setError(message);
      toast({
        title: 'Auto-Sniper Error',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    loading,
    result,
    error,
    evaluateTokens,
    clearResult,
  };
}
