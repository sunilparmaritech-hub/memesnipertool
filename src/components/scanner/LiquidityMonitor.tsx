import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScannedToken } from "@/hooks/useTokenScanner";
import { Zap, TrendingUp, TrendingDown, ExternalLink, ShieldCheck, ShieldX, Lock, Loader2, Search, ChevronLeft, ChevronRight, LogOut, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ActiveTradePosition {
  id: string;
  token_address: string;
  token_symbol: string;
  token_name: string;
  chain: string;
  entry_price: number;
  current_price: number;
  amount: number;
  entry_value: number;
  current_value: number;
  profit_loss_percent: number | null;
  profit_loss_value: number | null;
  profit_take_percent: number;
  stop_loss_percent: number;
  status: 'open' | 'closed' | 'pending';
  created_at: string;
}

interface LiquidityMonitorProps {
  pools: ScannedToken[];
  activeTrades: ActiveTradePosition[];
  loading: boolean;
  apiStatus: 'waiting' | 'active' | 'error' | 'rate_limited';
  onExitTrade?: (positionId: string, currentPrice: number) => void;
}

const POOLS_PER_PAGE = 20;

const formatLiquidity = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const PoolRow = ({ pool, index }: { pool: ScannedToken; index: number }) => {
  const isPositive = pool.priceChange24h >= 0;
  const initials = pool.symbol.slice(0, 2).toUpperCase();
  
  const avatarColors = [
    'bg-primary/20 text-primary',
    'bg-blue-500/20 text-blue-400',
    'bg-purple-500/20 text-purple-400',
    'bg-orange-500/20 text-orange-400',
    'bg-pink-500/20 text-pink-400',
    'bg-cyan-500/20 text-cyan-400',
  ];
  const avatarClass = avatarColors[index % avatarColors.length];

  const getSafetyIcons = () => {
    const honeypotSafe = pool.riskScore < 50;
    const liquidityLocked = pool.liquidityLocked;
    
    return (
      <div className="flex items-center gap-1">
        {honeypotSafe ? (
          <div className="p-1 rounded bg-success/20">
            <ShieldCheck className="w-3 h-3 text-success" />
          </div>
        ) : (
          <div className="p-1 rounded bg-destructive/20">
            <ShieldX className="w-3 h-3 text-destructive" />
          </div>
        )}
        {liquidityLocked && (
          <div className="p-1 rounded bg-success/20">
            <Lock className="w-3 h-3 text-success" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-3 p-2.5 hover:bg-secondary/40 transition-colors border-b border-border/30 last:border-b-0">
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${avatarClass}`}>
        {initials}
      </div>
      
      {/* Token Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-foreground text-xs truncate">{pool.name.slice(0, 12)}</span>
          <span className="text-muted-foreground text-xs">{pool.symbol}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono text-[10px]">{pool.address.slice(0, 4)}...{pool.address.slice(-4)}</span>
          <ExternalLink className="w-3 h-3 hover:text-primary cursor-pointer" />
        </div>
      </div>
      
      {/* Safety Icons */}
      {getSafetyIcons()}
      
      {/* Price & Liquidity */}
      <div className="text-right">
        <div className={`flex items-center justify-end gap-1 font-bold text-xs ${isPositive ? 'text-success' : 'text-destructive'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPositive ? '+' : ''}{pool.priceChange24h.toFixed(1)}%
        </div>
        <div className="text-[10px] text-muted-foreground">
          {formatLiquidity(pool.liquidity)}
        </div>
      </div>
    </div>
  );
};

const TradeRow = ({ trade, index, onExit }: { trade: ActiveTradePosition; index: number; onExit?: (id: string, price: number) => void }) => {
  const pnlPercent = trade.profit_loss_percent || 0;
  const pnlValue = trade.profit_loss_value || 0;
  const isPositive = pnlPercent >= 0;
  const initials = trade.token_symbol.slice(0, 2).toUpperCase();
  
  const avatarColors = [
    'bg-success/20 text-success',
    'bg-blue-500/20 text-blue-400',
    'bg-purple-500/20 text-purple-400',
    'bg-orange-500/20 text-orange-400',
    'bg-pink-500/20 text-pink-400',
    'bg-cyan-500/20 text-cyan-400',
  ];
  const avatarClass = avatarColors[index % avatarColors.length];

  return (
    <div className="flex items-center gap-2 p-2.5 hover:bg-secondary/40 transition-colors border-b border-border/30 last:border-b-0">
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${avatarClass}`}>
        {initials}
      </div>
      
      {/* Token Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-semibold text-foreground text-xs truncate">{trade.token_name.slice(0, 10)}</span>
          <span className="text-muted-foreground text-[10px]">{trade.token_symbol}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Entry: ${trade.entry_price.toFixed(6)}</span>
          <span className="text-muted-foreground/50">→</span>
          <span className={isPositive ? 'text-success' : 'text-destructive'}>
            ${trade.current_price.toFixed(6)}
          </span>
        </div>
      </div>
      
      {/* PnL */}
      <div className="text-right">
        <div className={`font-bold text-xs ${isPositive ? 'text-success' : 'text-destructive'}`}>
          {isPositive ? '+' : ''}{pnlPercent.toFixed(1)}%
        </div>
        <div className={`text-[10px] ${isPositive ? 'text-success/70' : 'text-destructive/70'}`}>
          {isPositive ? '+' : ''}${pnlValue.toFixed(2)}
        </div>
      </div>
      
      {/* Exit Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => onExit?.(trade.id, trade.current_price)}
      >
        <LogOut className="w-3 h-3 mr-1" />
        <span className="text-[10px]">Exit</span>
      </Button>
    </div>
  );
};

export default function LiquidityMonitor({ 
  pools, 
  activeTrades, 
  loading,
  apiStatus = 'waiting',
  onExitTrade
}: LiquidityMonitorProps) {
  const [activeTab, setActiveTab] = useState("pools");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const filteredPools = pools.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredPools.length / POOLS_PER_PAGE);
  const startIndex = (currentPage - 1) * POOLS_PER_PAGE;
  const paginatedPools = filteredPools.slice(startIndex, startIndex + POOLS_PER_PAGE);

  // Reset page when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const getStatusBadge = () => {
    switch (apiStatus) {
      case 'active':
        return <Badge className="bg-success/20 text-success border-success/30 text-[10px] px-1.5 py-0">Active</Badge>;
      case 'error':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] px-1.5 py-0">Error</Badge>;
      case 'rate_limited':
        return <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] px-1.5 py-0">Rate Limited</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0">Waiting...</Badge>;
    }
  };

  const openTrades = activeTrades.filter(t => t.status === 'open');

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 flex flex-col overflow-hidden" style={{ maxHeight: '520px' }}>
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Liquidity Monitor</CardTitle>
              <p className="text-[10px] text-muted-foreground">
                {pools.length} pools • {openTrades.length} trades
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3">
            <TabsList className="w-full bg-secondary/60 h-8">
              <TabsTrigger value="pools" className="flex-1 text-xs h-7 data-[state=active]:bg-success data-[state=active]:text-success-foreground">
                Pools ({filteredPools.length})
              </TabsTrigger>
              <TabsTrigger value="trades" className="flex-1 text-xs h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Active ({openTrades.length})
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="pools" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-border/30">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search pools..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 bg-secondary/40 border-border/30 h-7 text-xs"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Scanning pools...</p>
                </div>
              ) : paginatedPools.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Zap className="w-8 h-8 mb-2 opacity-30" />
                  <p className="font-medium text-xs mb-1">No pools detected yet</p>
                  <p className="text-[10px]">Enable the bot to start scanning</p>
                </div>
              ) : (
                paginatedPools.map((pool, idx) => (
                  <PoolRow key={pool.id} pool={pool} index={startIndex + idx} />
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-2 border-t border-border/30 bg-secondary/20">
                <span className="text-[10px] text-muted-foreground">
                  {currentPage}/{totalPages}
                </span>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="trades" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {openTrades.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <DollarSign className="w-8 h-8 mb-2 opacity-30" />
                  <p className="font-medium text-xs mb-1">No active trades</p>
                  <p className="text-[10px]">Trades will appear here when executed</p>
                </div>
              ) : (
                openTrades.map((trade, idx) => (
                  <TradeRow key={trade.id} trade={trade} index={idx} onExit={onExitTrade} />
                ))
              )}
            </div>
            
            {/* Trades Summary */}
            {openTrades.length > 0 && (
              <div className="p-2 border-t border-border/30 bg-secondary/20">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Total P/L:</span>
                  <span className={`font-bold ${
                    openTrades.reduce((sum, t) => sum + (t.profit_loss_value || 0), 0) >= 0 
                      ? 'text-success' 
                      : 'text-destructive'
                  }`}>
                    {openTrades.reduce((sum, t) => sum + (t.profit_loss_value || 0), 0) >= 0 ? '+' : ''}
                    ${openTrades.reduce((sum, t) => sum + (t.profit_loss_value || 0), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
