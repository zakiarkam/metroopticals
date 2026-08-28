export interface MetricValue {
  total: number;
  change?: string;
  direction?: "up" | "down";
}

export interface RecentOrder {
  id: number;
  orderNumber: string;
  customer: string;
  status: string;
  total: number;
  date: string;
  /** Where the sale happened, so the two channels are told apart at a glance. */
  channel?: "ONLINE" | "POS";
}

export interface TopProduct {
  id: number;
  name: string;
  category?: string;
  sold: number;
  revenue: number;
  price: number;
  discountedPrice?: number | null;
  images?: string[];
  stock?: number;
  description?: string;
  status?: string;
}

export interface StatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface OutOfStockProduct {
  id: number;
  title: string;
  category?: string;
  stock: number;
  lastUpdated: string;
}

/** Where the money in a period came from. */
export interface ChannelSplit {
  channel: "ONLINE" | "POS";
  orders: number;
  revenue: number;
}

/** One shop day of takings, for the trend line. */
export interface DailyRevenue {
  date: string;
  online: number;
  counter: number;
  total: number;
  orders: number;
}

/** Counter bills still owing money  the shop's credit book, in summary. */
export interface OutstandingSummary {
  count: number;
  total: number;
  overdueCount: number;
  overdueTotal: number;
  dueToday: number;
}

/** The shop counter, today. */
export interface CounterToday {
  date: string;
  bills: number;
  billed: number;
  collected: number;
  cashCollected: number;
  itemsSold: number;
  /** Every counter bill still owing money, not only today's. */
  balanceDue: number;
  unpaidBills: number;
}

export interface DashboardData {
  metrics: {
    revenue: MetricValue;
    orders: MetricValue;
    customers: MetricValue;
    products: {
      total: number;
      lowStock: number;
      outOfStock: number;
    };
  };
  recentOrders: RecentOrder[];
  topProducts: TopProduct[];
  statusBreakdown: StatusBreakdown[];
  outOfStockProducts: OutOfStockProduct[];
  channelSplit: ChannelSplit[];
  counterToday: CounterToday;
  dailyRevenue: DailyRevenue[];
  outstanding: OutstandingSummary;
}
