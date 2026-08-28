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
    channel: "ONLINE" | "POS";
    channelLabel: string;
    paymentStatus: string;
    amountPaid: number;
    balance: number;
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
  /** Website against counter, how the money came in, and who billed it. */
  channels: {
    byChannel: Array<{
      channel: "ONLINE" | "POS";
      orders: number;
      revenue: number;
      collected: number;
    }>;
    byMethod: Array<{
      method: string;
      collected: number;
      refunded: number;
      net: number;
    }>;
    byCashier: Array<{
      name: string;
      bills: number;
      billed: number;
      collected: number;
    }>;
    counter: {
      bills: number;
      cancelled: number;
      billed: number;
      collected: number;
      outstanding: number;
    };
  };
  statusBreakdown: Array<{ status: string; count: number }>;
};
