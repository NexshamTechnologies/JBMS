import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Search,
  Download,
  Printer,
  Calendar,
  IndianRupee,
  Users,
  Receipt,
  Package,
} from 'lucide-react';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';

import {
  Invoice,
  Payment,
  Party,
  Product,
} from '../types';

interface AnalyticsModuleProps {
  invoices: Invoice[];
  parties: Party[];
  payments: Payment[];
  products: Product[];
  theme: 'light' | 'dark';
}

type ReportSection =
  | 'sales'
  | 'customer'
  | 'financial'
  | 'billing'
  | 'products';

const COLORS = [
  '#2563eb',
  '#3b82f6',
  '#0ea5e9',
  '#22c55e',
  '#a78bfa',
  '#f59e0b',
  '#ef4444',
];

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const fmt = (n: number) =>
  `₹${Math.abs(Number(n) || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;

/* =========================================================
   MONTHLY SALES + COLLECTIONS
========================================================= */


function groupByMonth(
  invoices: Invoice[],
  payments: Payment[]
) {
  const map: Record<
    string,
    {
      month: string;
      sortKey: number;
      billed: number;
      collections: number;
    }
  > = {};

  invoices.forEach((invoice) => {
    const date = new Date(invoice.date);

    if (Number.isNaN(date.getTime())) return;

    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const key = `${year}-${monthIndex}`;

    if (!map[key]) {
      map[key] = {
        month: `${MONTHS[monthIndex]} ${String(year).slice(-2)}`,
        sortKey: year * 12 + monthIndex,
        billed: 0,
        collections: 0,
      };
    }

    map[key].billed += Number(invoice.grandTotal) || 0;
  });

  payments.forEach((payment) => {
    if (payment.status === 'Pending') return;

    const date = new Date(payment.date);

    if (Number.isNaN(date.getTime())) return;

    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const key = `${year}-${monthIndex}`;

    if (!map[key]) {
      map[key] = {
        month: `${MONTHS[monthIndex]} ${String(year).slice(-2)}`,
        sortKey: year * 12 + monthIndex,
        billed: 0,
        collections: 0,
      };
    }

    map[key].collections += Number(payment.amount) || 0;
  });

  return Object.values(map)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey, ...item }) => item);
}








/* =========================================================
   STATUS BADGE
========================================================= */

const StatusBadge = ({ status }: { status: string }) => {
  const classes =
    status === 'Paid'
      ? 'bg-emerald-500/15 text-emerald-500'
      : status === 'Partially Paid'
        ? 'bg-amber-500/15 text-amber-500'
        : status === 'Overdue'
          ? 'bg-rose-500/15 text-rose-500'
          : 'bg-rose-500/15 text-rose-500';

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${classes}`}
    >
      {status}
    </span>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export const AnalyticsModule: React.FC<AnalyticsModuleProps> = ({
  invoices,
  parties,
  payments,
  products,
  theme,
}) => {
  const [section, setSection] =
    useState<ReportSection>('sales');

  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [gstTypeFilter, setGstTypeFilter] =
    useState<'All' | 'GST' | 'Non-GST'>('All');

  /* =======================================================
     THEME
  ======================================================= */

  const tooltipStyle = {
    backgroundColor:
      theme === 'light' ? '#ffffff' : '#1e293b',
    borderColor:
      theme === 'light'
        ? 'rgba(15,23,42,0.08)'
        : 'rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color:
      theme === 'light' ? '#0f172a' : '#f8fafc',
  };

  const chartTextColor =
    theme === 'light' ? '#64748b' : '#cbd5e1';

  /* =======================================================
     CUSTOMERS
  ======================================================= */

  const customers = useMemo(
    () => parties.filter((p) => p.type === 'Customer'),
    [parties]
  );

  /* =======================================================
     FILTERED INVOICES
  ======================================================= */

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesDate =
        (!from || invoice.date >= from) &&
        (!to || invoice.date <= to);

      const matchesParty =
        !partyFilter ||
        invoice.partyId === partyFilter;

      const matchesSearch =
        !query ||
        invoice.invoiceNumber
          .toLowerCase()
          .includes(query) ||
        invoice.partyName
          .toLowerCase()
          .includes(query);

      return (
        matchesDate &&
        matchesParty &&
        matchesSearch
      );
    });
  }, [
    invoices,
    from,
    to,
    partyFilter,
    search,
  ]);

  /* =======================================================
     FILTERED PAYMENTS
  ======================================================= */

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesDate =
        (!from || payment.date >= from) &&
        (!to || payment.date <= to);

      const matchesParty =
        !partyFilter ||
        payment.partyId === partyFilter;

      return matchesDate && matchesParty;
    });
  }, [
    payments,
    from,
    to,
    partyFilter,
  ]);

  /* =======================================================
     MAIN FINANCIAL NUMBERS
  ======================================================= */

  const totalBilled = useMemo(
    () =>
      filteredInvoices.reduce(
        (sum, invoice) =>
          sum + Number(invoice.grandTotal || 0),
        0
      ),
    [filteredInvoices]
  );

  /*
   * Collections come directly from payment records.
   *
   * This is important because an Advance payment may not
   * belong to an invoice at all.
   */
  const totalCollections = useMemo(
    () =>
      filteredPayments
        .filter((payment) => payment.status !== 'Pending')
        .reduce(
          (sum, payment) =>
            sum + Number(payment.amount || 0),
          0
        ),
    [filteredPayments]
  );

  /*
   * Invoice outstanding is based on invoice paidAmount.
   * Advance money is intentionally NOT subtracted from
   * an unrelated invoice.
   */
  const totalOutstanding = useMemo(
    () =>
      filteredInvoices.reduce(
        (sum, invoice) =>
          sum +
          Math.max(
            0,
            Number(invoice.grandTotal || 0) -
              Number(invoice.paidAmount || 0)
          ),
        0
      ),
    [filteredInvoices]
  );

  const totalTax = useMemo(
    () =>
      filteredInvoices.reduce(
        (sum, invoice) =>
          sum +
          Number(invoice.cgstTotal || 0) +
          Number(invoice.sgstTotal || 0) +
          Number(invoice.igstTotal || 0),
        0
      ),
    [filteredInvoices]
  );

  const collectionRate =
    totalBilled > 0
      ? (totalCollections / totalBilled) * 100
      : 0;

  /* =======================================================
     MONTHLY DATA
  ======================================================= */

  const monthlyData = useMemo(
    () =>
      groupByMonth(
        filteredInvoices,
        filteredPayments
      ),
    [filteredInvoices, filteredPayments]
  );

  /* =======================================================
     INVOICE STATUS
  ======================================================= */

  const statusData = useMemo(() => {
    return [
      'Paid',
      'Partially Paid',
      'Unpaid',
      'Overdue',
    ]
      .map((status) => ({
        name: status,
        value: filteredInvoices
          .filter((invoice) => invoice.status === status)
          .reduce(
            (sum, invoice) =>
              sum + Number(invoice.grandTotal || 0),
            0
          ),
        count: filteredInvoices.filter(
          (invoice) => invoice.status === status
        ).length,
      }))
      .filter((item) => item.count > 0);
  }, [filteredInvoices]);

  /* =======================================================
     CUSTOMER ANALYTICS
  ======================================================= */

  const customerData = useMemo(() => {
    return customers
      .map((customer) => {
        const customerInvoices =
          filteredInvoices.filter(
            (invoice) =>
              invoice.partyId === customer.id
          );

        const customerPayments =
          filteredPayments.filter(
            (payment) =>
              payment.partyId === customer.id &&
              payment.status !== 'Pending'
          );

        const billed = customerInvoices.reduce(
          (sum, invoice) =>
            sum + Number(invoice.grandTotal || 0),
          0
        );

        const paid = customerPayments.reduce(
          (sum, payment) =>
            sum + Number(payment.amount || 0),
          0
        );

        const outstanding =
          customerInvoices.reduce(
            (sum, invoice) =>
              sum +
              Math.max(
                0,
                Number(invoice.grandTotal || 0) -
                  Number(invoice.paidAmount || 0)
              ),
            0
          );

        return {
          id: customer.id,
          name: customer.name,
          city: customer.city,
          billed,
          paid,
          outstanding,
          creditLimit: customer.creditLimit,
          invoices: customerInvoices.length,
        };
      })
      .filter(
        (customer) =>
          customer.billed > 0 ||
          customer.paid > 0
      )
      .sort(
        (a, b) => b.billed - a.billed
      );
  }, [
    customers,
    filteredInvoices,
    filteredPayments,
  ]);

  /* =======================================================
     GST ANALYTICS
  ======================================================= */

  const gstInvoices = filteredInvoices.filter(
    (invoice) =>
      invoice.isGstInvoice !== false
  );

  const nonGstInvoices = filteredInvoices.filter(
    (invoice) =>
      invoice.isGstInvoice === false
  );

  const gstRevenue = gstInvoices.reduce(
    (sum, invoice) =>
      sum + Number(invoice.grandTotal || 0),
    0
  );

  const nonGstRevenue = nonGstInvoices.reduce(
    (sum, invoice) =>
      sum + Number(invoice.grandTotal || 0),
    0
  );

  /* =======================================================
     PRODUCT ANALYTICS
  ======================================================= */

  const productData = useMemo(() => {
    return products
      .map((product) => ({
        id: product.id,
        name: product.name,
        unit: product.unit,
        hsnCode: product.hsnCode,
        category: product.category || 'General',
        gstRate: product.gstRate,
        price: product.sellingPrice,
        priceWithGst:
          product.sellingPrice *
          (1 + product.gstRate / 100),
      }))
      .sort(
        (a, b) => b.price - a.price
      );
  }, [products]);

  /* =======================================================
     EXPORT
  ======================================================= */

  const exportCSV = () => {
    const rows = [
      [
        'Invoice',
        'Date',
        'Customer',
        'Taxable',
        'GST',
        'Total',
        'Paid',
        'Outstanding',
        'Status',
      ],
      ...filteredInvoices.map((invoice) => [
        invoice.invoiceNumber,
        invoice.date,
        invoice.partyName,
        String(invoice.taxableValue),
        String(
          Number(invoice.cgstTotal || 0) +
            Number(invoice.sgstTotal || 0) +
            Number(invoice.igstTotal || 0)
        ),
        String(invoice.grandTotal),
        String(invoice.paidAmount),
        String(
          Math.max(
            0,
            invoice.grandTotal -
              invoice.paidAmount
          )
        ),
        invoice.status,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map(
            (cell) =>
              `"${String(cell).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(',')
      )
      .join('\n');

    const blob = new Blob(
      [csv],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement('a');

    anchor.href = url;
    anchor.download =
      `${section}-report.csv`;

    anchor.click();

    URL.revokeObjectURL(url);
  };

  /* =======================================================
     SECTIONS
  ======================================================= */

  const sections: {
    id: ReportSection;
    label: string;
    icon: React.ElementType;
  }[] = [
    {
      id: 'sales',
      label: 'Sales',
      icon: TrendingUp,
    },
    {
      id: 'customer',
      label: 'Customers',
      icon: Users,
    },
    {
      id: 'financial',
      label: 'Financial',
      icon: IndianRupee,
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: Receipt,
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
    },
  ];

  return (
    <div className="space-y-6">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="bg-[#141414] border border-white/10 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

        <div className="flex items-center gap-2">

          <BarChart3 className="w-5 h-5 text-blue-500" />

          <div>
            <h2 className="text-xl font-serif italic text-white">
              Reports & Analytics
            </h2>

            <p className="text-[11px] text-[#d1d1d1]/50 mt-0.5">
              Sales · Customers · Financial · Billing · Products
            </p>
          </div>

        </div>

        <div className="flex items-center gap-2 flex-wrap">

          <button
            onClick={() =>
              setShowFilters((value) => !value)
            }
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-bold border transition uppercase tracking-wider ${
              showFilters
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-[#1a1a1a] text-[#d1d1d1] border-white/10 hover:border-blue-500'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Filters
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-bold border bg-[#1a1a1a] text-emerald-500 border-white/10 hover:border-emerald-500 transition uppercase tracking-wider"
          >
            <Download className="w-3.5 h-3.5" />
            Excel
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-bold border bg-[#1a1a1a] text-[#d1d1d1] border-white/10 hover:border-blue-500 hover:text-blue-500 transition uppercase tracking-wider"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>

        </div>
      </div>

      {/* ===================================================
          FILTERS
      =================================================== */}

      {showFilters && (
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-4">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 mb-1">
                Search
              </label>

              <div className="relative">

                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#d1d1d1]/30" />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Invoice, customer..."
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />

              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 mb-1">
                Customer
              </label>

              <select
                value={partyFilter}
                onChange={(e) =>
                  setPartyFilter(e.target.value)
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">
                  All Customers
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 mb-1">
                From
              </label>

              <input
                type="date"
                value={from}
                onChange={(e) =>
                  setFrom(e.target.value)
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 mb-1">
                To
              </label>

              <input
                type="date"
                value={to}
                onChange={(e) =>
                  setTo(e.target.value)
                }
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

          </div>
        </div>
      )}

      {/* ===================================================
          TABS
      =================================================== */}

      <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">

        <div className="flex border-b border-white/10 overflow-x-auto">

          {sections.map((item) => {
            const Icon = item.icon;
            const active =
              section === item.id;

            return (
              <button
                key={item.id}
                onClick={() =>
                  setSection(item.id)
                }
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition border-b-2 whitespace-nowrap ${
                  active
                    ? 'text-blue-500 border-blue-500 bg-blue-500/5'
                    : 'text-[#d1d1d1]/50 border-transparent hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}

        </div>

        {/* =================================================
            SALES
        ================================================= */}

        {section === 'sales' && (
          <div className="p-5 space-y-5">

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

              <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50">
                  Gross Billed
                </p>

                <p className="text-2xl font-bold text-white mt-1">
                  {fmt(totalBilled)}
                </p>

                <p className="text-[10px] text-[#d1d1d1]/30 mt-1">
                  {filteredInvoices.length} Invoices
                </p>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50">
                  Collections
                </p>

                <p className="text-2xl font-bold text-emerald-500 mt-1">
                  {fmt(totalCollections)}
                </p>

                <p className="text-[10px] text-[#d1d1d1]/30 mt-1">
                  {filteredPayments.filter(
                    (p) => p.status !== 'Pending'
                  ).length} Payments
                </p>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50">
                  Outstanding
                </p>

                <p className="text-2xl font-bold text-rose-500 mt-1">
                  {fmt(totalOutstanding)}
                </p>

                <p className="text-[10px] text-[#d1d1d1]/30 mt-1">
                  Invoice Receivables
                </p>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50">
                  Collection Rate
                </p>

                <p className="text-2xl font-bold text-blue-500 mt-1">
                  {collectionRate.toFixed(1)}%
                </p>

                <p className="text-[10px] text-[#d1d1d1]/30 mt-1">
                  Collections vs Billed
                </p>
              </div>

            </div>

            {/* Charts */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <div>
                <h3 className="font-serif italic text-white mb-2">
                  Sales vs Collections
                </h3>

                <div className="h-60">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <AreaChart
                      data={monthlyData}
                    >
                      <XAxis
                        dataKey="month"
                        stroke={chartTextColor}
                        fontSize={10}
                      />

                      <YAxis
                        stroke={chartTextColor}
                        fontSize={10}
                        tickFormatter={(value) =>
                          `₹${value / 1000}k`
                        }
                      />

                      <Tooltip
                        formatter={(value: any, name: any) => [
                          fmt(Number(value)),
                          name === 'billed'
                            ? 'Billed'
                            : 'Collections',
                        ]}
                        contentStyle={tooltipStyle}
                      />

                      <Area
                        type="monotone"
                        dataKey="billed"
                        name="Billed"
                        stroke="#2563eb"
                        fill="#2563eb"
                        fillOpacity={0.12}
                      />

                      <Area
                        type="monotone"
                        dataKey="collections"
                        name="Collections"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.08}
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                </div>
              </div>

              <div>
                <h3 className="font-serif italic text-white mb-2">
                  Invoice Status
                </h3>

                <div className="h-60">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <PieChart>

                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusData.map(
                          (_, index) => (
                            <Cell
                              key={index}
                              fill={
                                COLORS[
                                  index %
                                    COLORS.length
                                ]
                              }
                            />
                          )
                        )}
                      </Pie>

                      <Tooltip
                        formatter={(value: any) => [
                          fmt(Number(value)),
                          'Amount',
                        ]}
                        contentStyle={tooltipStyle}
                      />

                      <Legend
                        wrapperStyle={{
                          fontSize: '10px',
                          color: chartTextColor,
                        }}
                      />

                    </PieChart>
                  </ResponsiveContainer>

                </div>
              </div>

            </div>

            {/* Invoice table */}

            <div>
              <h3 className="font-serif italic text-white mb-3">
                Sales Invoices
              </h3>

              <div className="overflow-x-auto rounded-xl border border-white/10">

                <table className="w-full text-xs text-[#d1d1d1]">

                  <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="p-3 text-left">
                        Invoice
                      </th>
                      <th className="p-3 text-left">
                        Customer
                      </th>
                      <th className="p-3">
                        Date
                      </th>
                      <th className="p-3 text-right">
                        Total
                      </th>
                      <th className="p-3 text-right">
                        Paid
                      </th>
                      <th className="p-3 text-right">
                        Outstanding
                      </th>
                      <th className="p-3">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">

                    {filteredInvoices.map(
                      (invoice) => (
                        <tr
                          key={invoice.id}
                          className="hover:bg-white/5"
                        >
                          <td className="p-3 font-bold text-blue-500">
                            {invoice.invoiceNumber}
                          </td>

                          <td className="p-3 font-semibold text-white">
                            {invoice.partyName}
                          </td>

                          <td className="p-3 text-[#d1d1d1]/60">
                            {invoice.date}
                          </td>

                          <td className="p-3 text-right font-bold text-white">
                            {fmt(invoice.grandTotal)}
                          </td>

                          <td className="p-3 text-right text-emerald-500">
                            {fmt(invoice.paidAmount)}
                          </td>

                          <td className="p-3 text-right text-rose-500">
                            {fmt(
                              Math.max(
                                0,
                                invoice.grandTotal -
                                  invoice.paidAmount
                              )
                            )}
                          </td>

                          <td className="p-3">
                            <StatusBadge
                              status={
                                invoice.status
                              }
                            />
                          </td>
                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            </div>

          </div>
        )}

        {/* =================================================
            CUSTOMERS
        ================================================= */}

        {section === 'customer' && (
          <div className="p-5 space-y-5">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <div>
                <h3 className="font-serif italic text-white mb-2">
                  Top Customers by Billing
                </h3>

                <div className="h-60">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={customerData.slice(0, 8)}
                      layout="vertical"
                    >
                      <XAxis
                        type="number"
                        stroke={chartTextColor}
                        fontSize={10}
                      />

                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke={chartTextColor}
                        fontSize={10}
                        width={110}
                      />

                      <Tooltip
                        formatter={(value: any) => [
                          fmt(Number(value)),
                          'Billed',
                        ]}
                        contentStyle={tooltipStyle}
                      />

                      <Bar
                        dataKey="billed"
                        fill="#2563eb"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                </div>
              </div>

              <div>
                <h3 className="font-serif italic text-white mb-2">
                  Customer Outstanding
                </h3>

                <div className="space-y-2 max-h-60 overflow-y-auto">

                  {customerData.map(
                    (customer) => (
                      <div
                        key={customer.id}
                        className="bg-[#1a1a1a] rounded-xl p-3.5 border border-white/5 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold text-white text-xs">
                            {customer.name}
                          </p>

                          <p className="text-[10px] text-[#d1d1d1]/40">
                            {customer.city ||
                              '—'}
                          </p>
                        </div>

                        <p
                          className={`font-black ${
                            customer.outstanding >
                            0
                              ? 'text-rose-500'
                              : 'text-emerald-500'
                          }`}
                        >
                          {fmt(
                            customer.outstanding
                          )}
                        </p>
                      </div>
                    )
                  )}

                </div>
              </div>

            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">

              <table className="w-full text-xs text-[#d1d1d1]">

                <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="p-3 text-left">
                      Customer
                    </th>
                    <th className="p-3">
                      Invoices
                    </th>
                    <th className="p-3 text-right">
                      Billed
                    </th>
                    <th className="p-3 text-right">
                      Paid
                    </th>
                    <th className="p-3 text-right">
                      Outstanding
                    </th>
                    <th className="p-3 text-right">
                      Credit Limit
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">

                  {customerData.map(
                    (customer) => (
                      <tr
                        key={customer.id}
                        className="hover:bg-white/5"
                      >
                        <td className="p-3 font-bold text-blue-500">
                          {customer.name}
                        </td>

                        <td className="p-3 text-center">
                          {customer.invoices}
                        </td>

                        <td className="p-3 text-right font-semibold text-white">
                          {fmt(customer.billed)}
                        </td>

                        <td className="p-3 text-right text-emerald-500">
                          {fmt(customer.paid)}
                        </td>

                        <td
                          className={`p-3 text-right font-bold ${
                            customer.outstanding >
                            0
                              ? 'text-rose-500'
                              : 'text-emerald-500'
                          }`}
                        >
                          {fmt(
                            customer.outstanding
                          )}
                        </td>

                        <td className="p-3 text-right text-blue-500">
                          {fmt(
                            customer.creditLimit
                          )}
                        </td>
                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>
        )}

        {/* =================================================
            FINANCIAL
        ================================================= */}

        {section === 'financial' && (
          <div className="p-5 space-y-5">

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

              {[
                {
                  label: 'Gross Sales',
                  value: totalBilled,
                  color: 'text-white',
                  sub: 'Total invoice value',
                },
                {
                  label: 'GST Collected',
                  value: totalTax,
                  color: 'text-blue-500',
                  sub: 'CGST + SGST + IGST',
                },
                {
                  label: 'Collections',
                  value: totalCollections,
                  color: 'text-emerald-500',
                  sub: 'Actual payments received',
                },
                {
                  label: 'Outstanding',
                  value: totalOutstanding,
                  color: 'text-rose-500',
                  sub: 'Customer receivables',
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/10"
                >
                  <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50">
                    {card.label}
                  </p>

                  <p
                    className={`text-2xl font-bold ${card.color} mt-1`}
                  >
                    {fmt(card.value)}
                  </p>

                  <p className="text-[10px] text-[#d1d1d1]/30 mt-1">
                    {card.sub}
                  </p>
                </div>
              ))}

            </div>

            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">

              <div className="flex justify-between items-center mb-4">

                <div>
                  <h3 className="font-serif italic text-white">
                    Collection Performance
                  </h3>

                  <p className="text-[10px] text-[#d1d1d1]/40">
                    Actual payments received against billed sales
                  </p>
                </div>

                <span className="text-2xl font-black text-blue-500">
                  {collectionRate.toFixed(1)}%
                </span>

              </div>

              <div className="h-3 bg-white/5 rounded-full overflow-hidden">

                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      collectionRate,
                      100
                    )}%`,
                  }}
                />

              </div>

            </div>

            <div>
              <h3 className="font-serif italic text-white mb-3">
                Monthly Financial Trend
              </h3>

              <div className="h-56">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart data={monthlyData}>

                    <XAxis
                      dataKey="month"
                      stroke={chartTextColor}
                      fontSize={10}
                    />

                    <YAxis
                      stroke={chartTextColor}
                      fontSize={10}
                      tickFormatter={(value) =>
                        `₹${value / 1000}k`
                      }
                    />

                    <Tooltip
                      formatter={(value: any, name: any) => [
                        fmt(Number(value)),
                        name === 'billed'
                          ? 'Billed'
                          : 'Collections',
                      ]}
                      contentStyle={tooltipStyle}
                    />

                    <Bar
                      dataKey="billed"
                      name="Billed"
                      fill="#2563eb"
                      radius={[4, 4, 0, 0]}
                    />

                    <Bar
                      dataKey="collections"
                      name="Collections"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                    />

                  </BarChart>
                </ResponsiveContainer>

              </div>
            </div>

          </div>
        )}

        {/* =================================================
            BILLING
        ================================================= */}

        {section === 'billing' && (
          <div className="p-5 space-y-5">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50">
                  GST Sales
                </p>

                <p className="text-xl font-bold text-blue-500 mt-1">
                  {fmt(gstRevenue)}
                </p>

                <p className="text-[10px] text-[#d1d1d1]/30">
                  {gstInvoices.length} invoices
                </p>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50">
                  Non-GST Sales
                </p>

                <p className="text-xl font-bold text-indigo-500 mt-1">
                  {fmt(nonGstRevenue)}
                </p>

                <p className="text-[10px] text-[#d1d1d1]/30">
                  {nonGstInvoices.length} invoices
                </p>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50">
                  GST Collected
                </p>

                <p className="text-xl font-bold text-rose-500 mt-1">
                  {fmt(totalTax)}
                </p>

                <p className="text-[10px] text-[#d1d1d1]/30">
                  CGST + SGST + IGST
                </p>
              </div>

            </div>

            <div className="flex items-center gap-2">

              <span className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 font-bold">
                Filter:
              </span>

              {(
                ['All', 'GST', 'Non-GST'] as const
              ).map((type) => (
                <button
                  key={type}
                  onClick={() =>
                    setGstTypeFilter(type)
                  }
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    gstTypeFilter === type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#1a1a1a] text-[#d1d1d1]/60 border border-white/10'
                  }`}
                >
                  {type === 'All'
                    ? 'All Invoices'
                    : `${type} Sales`}
                </button>
              ))}

            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">

              <table className="w-full text-xs text-[#d1d1d1]">

                <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="p-3 text-left">
                      Invoice
                    </th>
                    <th className="p-3">
                      Customer
                    </th>
                    <th className="p-3">
                      Type
                    </th>
                    <th className="p-3 text-right">
                      Taxable
                    </th>
                    <th className="p-3 text-right">
                      GST
                    </th>
                    <th className="p-3 text-right">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">

                  {filteredInvoices
                    .filter(
                      (invoice) =>
                        gstTypeFilter ===
                          'All' ||
                        (gstTypeFilter ===
                          'GST' &&
                          invoice.isGstInvoice !==
                            false) ||
                        (gstTypeFilter ===
                          'Non-GST' &&
                          invoice.isGstInvoice ===
                            false)
                    )
                    .map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="hover:bg-white/5"
                      >

                        <td className="p-3 font-bold text-blue-500">
                          {invoice.invoiceNumber}
                        </td>

                        <td className="p-3 text-white">
                          {invoice.partyName}
                        </td>

                        <td className="p-3 text-center">

                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              invoice.isGstInvoice ===
                              false
                                ? 'bg-slate-500/15 text-slate-400'
                                : 'bg-emerald-500/15 text-emerald-500'
                            }`}
                          >
                            {invoice.isGstInvoice ===
                            false
                              ? 'Non-GST'
                              : 'GST'}
                          </span>

                        </td>

                        <td className="p-3 text-right">
                          {fmt(
                            invoice.taxableValue
                          )}
                        </td>

                        <td className="p-3 text-right text-rose-500">
                          {fmt(
                            Number(
                              invoice.cgstTotal
                            ) +
                              Number(
                                invoice.sgstTotal
                              ) +
                              Number(
                                invoice.igstTotal
                              )
                          )}
                        </td>

                        <td className="p-3 text-right font-bold text-white">
                          {fmt(
                            invoice.grandTotal
                          )}
                        </td>

                      </tr>
                    ))}

                </tbody>

              </table>

            </div>

          </div>
        )}

        {/* =================================================
            PRODUCTS
        ================================================= */}

        {section === 'products' && (
          <div className="p-5 space-y-5">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50">
                  Total Products
                </p>

                <p className="text-2xl font-bold text-blue-500 mt-1">
                  {products.length}
                </p>

                <p className="text-[10px] text-[#d1d1d1]/30">
                  Registered in catalog
                </p>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50">
                  Categories
                </p>

                <p className="text-2xl font-bold text-indigo-500 mt-1">
                  {
                    new Set(
                      products.map(
                        (product) =>
                          product.category ||
                          'General'
                      )
                    ).size
                  }
                </p>

                <p className="text-[10px] text-[#d1d1d1]/30">
                  Product categories
                </p>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50">
                  Average Selling Price
                </p>

                <p className="text-2xl font-bold text-emerald-500 mt-1">
                  {fmt(
                    products.length
                      ? products.reduce(
                          (sum, product) =>
                            sum +
                            Number(
                              product.sellingPrice ||
                                0
                            ),
                          0
                        ) / products.length
                      : 0
                  )}
                </p>

                <p className="text-[10px] text-[#d1d1d1]/30">
                  Catalog average
                </p>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <div>
                <h3 className="font-serif italic text-white mb-2">
                  Product Price Distribution
                </h3>

                <div className="h-60">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={productData.slice(
                        0,
                        10
                      )}
                      layout="vertical"
                    >

                      <XAxis
                        type="number"
                        stroke={chartTextColor}
                        fontSize={10}
                      />

                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke={chartTextColor}
                        fontSize={10}
                        width={120}
                      />

                      <Tooltip
                        formatter={(value: any) => [
                          fmt(Number(value)),
                          'Selling Price',
                        ]}
                        contentStyle={tooltipStyle}
                      />

                      <Bar
                        dataKey="price"
                        fill="#2563eb"
                        radius={[
                          0,
                          4,
                          4,
                          0,
                        ]}
                      />

                    </BarChart>
                  </ResponsiveContainer>

                </div>
              </div>

              <div>
                <h3 className="font-serif italic text-white mb-2">
                  Catalog Overview
                </h3>

                <div className="space-y-2 max-h-60 overflow-y-auto">

                  {productData.map(
                    (product) => (
                      <div
                        key={product.id}
                        className="bg-[#1a1a1a] rounded-xl p-3.5 border border-white/5 flex justify-between items-center"
                      >

                        <div>
                          <p className="font-bold text-white text-xs">
                            {product.name}
                          </p>

                          <p className="text-[10px] text-[#d1d1d1]/40">
                            HSN: {product.hsnCode} · GST:{' '}
                            {product.gstRate}%
                          </p>
                        </div>

                        <div className="text-right">

                          <p className="font-bold text-blue-500">
                            {fmt(
                              product.price
                            )}{' '}
                            / {product.unit}
                          </p>

                          <p className="text-[9px] text-[#d1d1d1]/40">
                            Incl GST:{' '}
                            {fmt(
                              product.priceWithGst
                            )}
                          </p>

                        </div>

                      </div>
                    )
                  )}

                </div>
              </div>

            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">

              <table className="w-full text-xs text-[#d1d1d1]">

                <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="p-3 text-left">
                      Product
                    </th>
                    <th className="p-3">
                      Category
                    </th>
                    <th className="p-3">
                      HSN
                    </th>
                    <th className="p-3 text-right">
                      GST
                    </th>
                    <th className="p-3 text-right">
                      Selling Price
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">

                  {productData.map(
                    (product) => (
                      <tr
                        key={product.id}
                        className="hover:bg-white/5"
                      >

                        <td className="p-3 font-bold text-white">
                          {product.name}
                        </td>

                        <td className="p-3 text-[#d1d1d1]/60">
                          {product.category}
                        </td>

                        <td className="p-3 font-mono text-[#d1d1d1]/60">
                          {product.hsnCode}
                        </td>

                        <td className="p-3 text-right text-blue-500">
                          {product.gstRate}%
                        </td>

                        <td className="p-3 text-right font-bold text-white">
                          {fmt(
                            product.price
                          )}{' '}
                          / {product.unit}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};