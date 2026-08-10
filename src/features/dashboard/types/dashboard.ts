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
}
