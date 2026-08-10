export type ReportExportPayload = {
  range: {
    startDate: string;
    endDate: string;
    label: string;
    isCustomRange: boolean;
  };
  summary: {
    month: string;
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    newCustomers: number;
    totalProducts: number;
    statusBreakdown: Array<{ status: string; count: number }>;
  };
  orders: Array<{
    id: number;
    orderNumber: string;
    status: string;
    totalAmount: number;
    itemsCount: number;
    customerName: string;
    customerEmail: string;
    createdAt: string;
  }>;
  products: Array<{
    id: number;
    title: string;
    sku: string;
    category: string;
    price: number;
    stock: number;
    status: string;
    ordersCount: number;
  }>;
  topProducts: Array<{
    id: number;
    name: string;
    sku: string;
    category: string;
    sold: number;
    revenue: number;
  }>;
  statusBreakdown: Array<{ status: string; count: number }>;
};
