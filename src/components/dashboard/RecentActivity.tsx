import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, Bot, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: 'trade' | 'alert' | 'bot' | 'scan';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'success' | 'warning' | 'info';
  amount?: string;
  change?: number;
}

const recentActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'trade',
    title: 'Bought BONK',
    description: '0.5 SOL → 1.2M BONK',
    timestamp: new Date(Date.now() - 10 * 60000),
    status: 'success',
    change: 12.5,
  },
  {
    id: '2',
    type: 'alert',
    title: 'High Volume Alert',
    description: 'WIF volume spike detected',
    timestamp: new Date(Date.now() - 35 * 60000),
    status: 'warning',
  },
  {
    id: '3',
    type: 'bot',
    title: 'Bot Activated',
    description: 'Liquidity bot started scanning',
    timestamp: new Date(Date.now() - 2 * 60 * 60000),
    status: 'info',
  },
  {
    id: '4',
    type: 'trade',
    title: 'Sold MYRO',
    description: '500K MYRO → 0.8 SOL',
    timestamp: new Date(Date.now() - 3 * 60 * 60000),
    status: 'success',
    change: -5.2,
  },
  {
    id: '5',
    type: 'scan',
    title: 'New Token Found',
    description: 'PUMP passed risk checks',
    timestamp: new Date(Date.now() - 5 * 60 * 60000),
    status: 'success',
  },
];

const activityIcons = {
  trade: TrendingUp,
  alert: AlertTriangle,
  bot: Bot,
  scan: CheckCircle,
};

const activityColors = {
  success: "bg-success/20 text-success border-success/30",
  warning: "bg-warning/20 text-warning border-warning/30",
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default function RecentActivity() {
  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
      </div>
      
      <CardHeader className="relative pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/10">
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <p className="text-xs text-muted-foreground">Your latest actions</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative pt-0">
        <div className="space-y-2">
          {recentActivities.map((activity, index) => {
            const Icon = activityIcons[activity.type];
            const colorClass = activityColors[activity.status || 'info'];
            
            return (
              <div
                key={activity.id}
                className="group flex items-start gap-3 p-3 bg-secondary/30 hover:bg-secondary/50 rounded-xl transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={cn("p-2 rounded-lg border shrink-0", colorClass)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                    </div>
                    {activity.change !== undefined && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "shrink-0 text-[10px] px-1.5",
                          activity.change >= 0 
                            ? "bg-success/10 text-success border-success/30" 
                            : "bg-destructive/10 text-destructive border-destructive/30"
                        )}
                      >
                        {activity.change >= 0 ? "+" : ""}{activity.change}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
