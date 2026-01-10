import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendingToken {
  symbol: string;
  name: string;
  price: string;
  change24h: number;
  volume: string;
  hot?: boolean;
}

const trendingTokens: TrendingToken[] = [
  { symbol: "BONK", name: "Bonk", price: "$0.00003241", change24h: 15.4, volume: "$125M", hot: true },
  { symbol: "WIF", name: "dogwifhat", price: "$2.45", change24h: 8.2, volume: "$89M", hot: true },
  { symbol: "MYRO", name: "Myro", price: "$0.156", change24h: -3.5, volume: "$42M" },
  { symbol: "POPCAT", name: "Popcat", price: "$0.892", change24h: 22.1, volume: "$67M", hot: true },
  { symbol: "BOME", name: "Book of Meme", price: "$0.0123", change24h: -1.2, volume: "$35M" },
];

export default function MarketOverview() {
  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
      </div>
      
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/10">
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Trending Now</CardTitle>
              <p className="text-xs text-muted-foreground">Hot tokens on Solana</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-orange-500/10 text-orange-400 border-orange-500/30">
            Live
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="relative pt-0">
        <div className="space-y-2">
          {trendingTokens.map((token, index) => (
            <div
              key={token.symbol}
              className="group flex items-center justify-between p-3 bg-secondary/30 hover:bg-secondary/50 rounded-xl transition-all duration-200 cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs",
                    "bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 text-primary"
                  )}>
                    {token.symbol.slice(0, 2)}
                  </div>
                  {token.hot && (
                    <div className="absolute -top-1 -right-1">
                      <Sparkles className="w-3 h-3 text-orange-400" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{token.symbol}</p>
                    {token.hot && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-orange-500/20 text-orange-400">
                        🔥 Hot
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{token.name}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-medium text-sm">{token.price}</p>
                <div className={cn(
                  "flex items-center justify-end gap-1 text-xs font-medium",
                  token.change24h >= 0 ? "text-success" : "text-destructive"
                )}>
                  {token.change24h >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {token.change24h >= 0 ? "+" : ""}{token.change24h}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
