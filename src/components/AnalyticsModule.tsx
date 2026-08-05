import React, { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Search, Download, Printer,
  Calendar, IndianRupee, Users, Receipt, Package
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { Invoice, Payment, Party, Product } from '../types';

interface AnalyticsModuleProps {
  salesOrders: any[];
  fabricRolls: any[];
  invoices: Invoice[];
  parties: Party[];
  payments: Payment[];
  products: Product[];
  theme: 'light' | 'dark';
}

type ReportSection = 'sales' | 'customer' | 'financial' | 'billing' | 'inventory';
const COLORS = ['#2563eb', '#3b82f6', '#0ea5e9', '#22c55e', '#a78bfa', '#f59e0b', '#ef4444'];
const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmt = (n: number) => String.fromCharCode(8377) + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

function groupByMonth(invoices: Invoice[]) {
  const map: Record<string, { month: string; revenue: number }> = {};
  invoices.forEach(inv => {
    const d = new Date(inv.date);
    const key = `${MONTHS[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
    if (!map[key]) map[key] = { month: key, revenue: 0 };
    map[key].revenue += inv.grandTotal;
  });
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

export const AnalyticsModule: React.FC<AnalyticsModuleProps> = ({
  invoices, parties, payments, products, theme,
}) => {
  const tt = { backgroundColor: theme === 'light' ? '#fff' : '#1e293b', borderColor: theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.1)', borderRadius: '12px', color: theme === 'light' ? '#0f172a' : '#f8fafc' };
  const tc = theme === 'light' ? '#64748b' : '#cbd5e1';

  const [section, setSection] = useState<ReportSection>('sales');
  const [search, setSearch]   = useState('');
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');
  const [partyF, setPartyF]   = useState('');
  const [showF, setShowF]     = useState(false);
  const [gstTypeFilter, setGstTypeFilter] = useState<'All' | 'GST' | 'Non-GST'>('All');

  const customers = parties.filter(p => p.type === 'Customer');

  const fi = useMemo(() => invoices.filter(inv =>
    (!from || inv.date >= from) && (!to || inv.date <= to) &&
    (!partyF || inv.partyId === partyF) &&
    (!search || inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || inv.partyName.toLowerCase().includes(search.toLowerCase()))
  ), [invoices, from, to, partyF, search]);

  const fp = useMemo(() => payments.filter(p =>
    (!from || p.date >= from) && (!to || p.date <= to) && (!partyF || p.partyId === partyF)
  ), [payments, from, to, partyF]);

  const totalRev = fi.reduce((s, i) => s + i.grandTotal, 0);
  const totalRec = fi.reduce((s, i) => s + i.paidAmount, 0);
  const totalOut = totalRev - totalRec;
  const totalTax = fi.reduce((s, i) => s + i.cgstTotal + i.sgstTotal + i.igstTotal, 0);
  const monthly  = groupByMonth(fi);

  const statusData = ['Paid','Unpaid','Partially Paid','Overdue'].map(st => ({
    name: st, value: fi.filter(i => i.status === st).reduce((s,i)=>s+i.grandTotal,0),
    count: fi.filter(i => i.status === st).length,
  })).filter(d => d.count > 0);

  const custData = customers.map(c => {
    const ci = invoices.filter(i => i.partyId === c.id);
    const billed = ci.reduce((s,i)=>s+i.grandTotal,0);
    const paid   = ci.reduce((s,i)=>s+i.paidAmount,0);
    return { name: c.name, city: c.city, billed, paid, outstanding: billed-paid, creditLimit: c.creditLimit };
  }).filter(c => c.billed > 0).sort((a,b) => b.outstanding - a.outstanding);

  const prodData = products.map(p => ({
    name: p.name, unit: p.unit, hsnCode: p.hsnCode, category: p.category || 'General',
    gstRate: p.gstRate, price: p.sellingPrice,
    priceGst: +(p.sellingPrice * (1 + p.gstRate / 100)).toFixed(0),
  })).sort((a,b) => b.price - a.price);

  const gstRev    = fi.filter(i => i.isGstInvoice !== false).reduce((s,i)=>s+i.grandTotal,0);
  const nonGstRev = fi.filter(i => i.isGstInvoice === false).reduce((s,i)=>s+i.grandTotal,0);
  const gstCount    = fi.filter(i => i.isGstInvoice !== false).length;
  const nonGstCount = fi.filter(i => i.isGstInvoice === false).length;

  const exportCSV = () => {
    const rows = [['Invoice','Date','Customer','Total','Paid','Outstanding','Status'],
      ...fi.map(i=>[i.invoiceNumber,i.date,i.partyName,i.grandTotal.toString(),i.paidAmount.toString(),(i.grandTotal-i.paidAmount).toString(),i.status])];
    const csv  = rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download=`${section}_report.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const SECTIONS: { id: ReportSection; label: string; icon: React.ElementType }[] = [
    { id:'sales',label:'Sales',icon:TrendingUp },{ id:'customer',label:'Customers',icon:Users },
    { id:'financial',label:'Financial',icon:IndianRupee },
    { id:'billing',label:'Billing',icon:Receipt },{ id:'inventory',label:'Inventory',icon:Package },
  ];

  const SBadge = ({s}:{s:string}) => (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${s==='Paid'?'bg-emerald-500/15 text-emerald-500':s==='Overdue'?'bg-rose-500/15 text-rose-500':s==='Partially Paid'?'bg-amber-500/15 text-amber-500':'bg-rose-500/15 text-rose-500'}`}>{s}</span>
  );

  return (
    <div className="space-y-6">
      <div className="bg-[#141414] border border-white/10 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <div>
            <h2 className="text-xl font-serif italic text-white">Reports &amp; Analytics</h2>
            <p className="text-[11px] text-[#d1d1d1]/50 mt-0.5">Sales · Customer · Financial · Billing · Inventory</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={()=>setShowF(f=>!f)} className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-bold border transition uppercase tracking-wider ${showF?'bg-blue-600 text-white border-blue-600':'bg-[#1a1a1a] text-[#d1d1d1] border-white/10 hover:border-blue-500'}`}><Calendar className="w-3.5 h-3.5"/>Filters</button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-bold border bg-[#1a1a1a] text-emerald-500 border-white/10 hover:border-emerald-500 transition uppercase tracking-wider"><Download className="w-3.5 h-3.5"/>Excel</button>
          <button onClick={()=>window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-bold border bg-[#1a1a1a] text-[#d1d1d1] border-white/10 hover:border-blue-500 hover:text-blue-500 transition uppercase tracking-wider"><Printer className="w-3.5 h-3.5"/>Print</button>
        </div>
      </div>

      {showF && (
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="block text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 mb-1">Search</label>
              <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#d1d1d1]/30"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Invoice, customer..." className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"/>
              </div>
            </div>
            <div><label className="block text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 mb-1">Customer</label>
              <select value={partyF} onChange={e=>setPartyF(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500">
                <option value="">All</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="block text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 mb-1">From</label>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500"/>
            </div>
            <div><label className="block text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 mb-1">To</label>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500"/>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex border-b border-white/10 overflow-x-auto">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button key={s.id} onClick={()=>setSection(s.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition border-b-2 whitespace-nowrap ${active?'text-blue-500 border-blue-500 bg-blue-500/5':'text-[#d1d1d1]/50 border-transparent hover:text-white'}`}>
                <Icon className="w-3.5 h-3.5"/>{s.label}
              </button>
            );
          })}
        </div>

        {section==='sales'&&(
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {label:'Gross Billed',     value:fmt(totalRev), color:'text-white',       sub:`${fi.length} Invoices`},
                {label:'Collections Recv',  value:fmt(totalRec), color:'text-emerald-500',sub:`${fp.length} Payments`},
                {label:'Pending Receiv',   value:fmt(totalOut), color:'text-rose-500',   sub:'Unpaid Invoice Balance'},
              ].map(c=>(<div key={c.label} className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50 mb-1">{c.label}</p>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-[10px] text-[#d1d1d1]/30 mt-0.5">{c.sub}</p>
              </div>))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2"><h3 className="font-serif italic text-white">Monthly Billed Volume</h3>
                <div className="h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthly}>
                  <XAxis dataKey="month" stroke={tc} fontSize={10} tick={{fill:tc,opacity:0.6}}/><YAxis stroke={tc} fontSize={10} tick={{fill:tc,opacity:0.6}} tickFormatter={v=>`${String.fromCharCode(8377)}${v/1000}k`}/>
                  <Tooltip formatter={(v:any)=>[fmt(Number(v)),'Revenue']} contentStyle={tt}/>
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} strokeWidth={2}/>
                </AreaChart></ResponsiveContainer></div>
              </div>
              <div className="space-y-2"><h3 className="font-serif italic text-white">Invoice Status Mix</h3>
                <div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                    {statusData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v:any)=>[fmt(Number(v)),'Volume']} contentStyle={tt}/><Legend wrapperStyle={{fontSize:'10px',color:tc}}/>
                </PieChart></ResponsiveContainer></div>
              </div>
            </div>
            <div><h3 className="font-serif italic text-white mb-3">Sales Invoices</h3>
              <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full text-xs text-[#d1d1d1]">
                <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest border-b border-white/10"><tr>
                  <th className="p-3 text-left">Invoice #</th><th className="p-3 text-left">Customer</th><th className="p-3">Date</th><th className="p-3 text-right">Taxable</th><th className="p-3 text-right">GST</th><th className="p-3 text-right">Total</th><th className="p-3">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-white/5">{fi.map(i=>(
                  <tr key={i.id} className="hover:bg-white/5 transition">
                    <td className="p-3 font-bold text-blue-500">{i.invoiceNumber}</td><td className="p-3 font-semibold text-white">{i.partyName}</td>
                    <td className="p-3 text-[#d1d1d1]/60">{i.date}</td><td className="p-3 text-right">{fmt(i.taxableValue)}</td>
                    <td className="p-3 text-right text-rose-500">{fmt(i.cgstTotal+i.sgstTotal+i.igstTotal)}</td><td className="p-3 text-right font-bold text-white">{fmt(i.grandTotal)}</td>
                    <td className="p-3"><SBadge s={i.status}/></td>
                  </tr>
                ))}</tbody>
              </table></div>
            </div>
          </div>
        )}

        {section==='customer'&&(
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2"><h3 className="font-serif italic text-white">Top Customers by Volume</h3>
                <div className="h-60"><ResponsiveContainer width="100%" height="100%"><BarChart data={custData.slice(0,6)} layout="vertical">
                  <XAxis type="number" stroke={tc} fontSize={10} tickFormatter={v=>`${String.fromCharCode(8377)}${v/1000}k`}/>
                  <YAxis type="category" dataKey="name" stroke={tc} fontSize={10} width={110} tick={{fill:tc,opacity:0.8}}/>
                  <Tooltip formatter={(v:any)=>[fmt(Number(v)),'Billed']} contentStyle={tt}/>
                  <Bar dataKey="billed" fill="#2563eb" radius={[0,4,4,0]}/>
                </BarChart></ResponsiveContainer></div>
              </div>
              <div className="space-y-2"><h3 className="font-serif italic text-white">Customer Outstanding Balances</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {custData.map((c,i)=>(<div key={i} className="bg-[#1a1a1a] rounded-xl p-3.5 border border-white/5 flex justify-between items-center">
                    <div><p className="font-bold text-white text-xs">{c.name}</p><p className="text-[10px] text-[#d1d1d1]/40">{c.city}</p></div>
                    <p className={`font-black ${c.outstanding>0?'text-rose-500':'text-emerald-500'}`}>{fmt(c.outstanding)}</p>
                  </div>))}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full text-xs text-[#d1d1d1]">
              <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest border-b border-white/10"><tr>
                <th className="p-3 text-left">Customer</th><th className="p-3">City</th><th className="p-3 text-right">Billed</th><th className="p-3 text-right">Paid</th><th className="p-3 text-right">Outstanding</th><th className="p-3 text-right">Credit Limit</th>
              </tr></thead>
              <tbody className="divide-y divide-white/5">
                {custData.map((c,i)=>(<tr key={i} className="hover:bg-white/5 transition">
                  <td className="p-3 font-bold text-blue-500">{c.name}</td><td className="p-3 text-[#d1d1d1]/60">{c.city}</td>
                  <td className="p-3 text-right font-semibold text-white">{fmt(c.billed)}</td><td className="p-3 text-right text-emerald-500">{fmt(c.paid)}</td>
                  <td className={`p-3 text-right font-bold ${c.outstanding>0?'text-rose-500':'text-emerald-500'}`}>{fmt(c.outstanding)}</td>
                  <td className="p-3 text-right text-blue-500">{fmt(c.creditLimit)}</td>
                </tr>))}
              </tbody>
            </table></div>
          </div>
        )}

        {section==='financial'&&(
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {label:'Gross Revenue',   value:fmt(totalRev),color:'text-white',sub:'Total billed revenue'},
                {label:'Total Collections',value:fmt(totalRec),color:'text-emerald-500',sub:'Payments collected'},
                {label:'Customer Outstanding',value:fmt(totalOut),color:'text-rose-500',sub:'Net customer receivable'},
              ].map(c=>(<div key={c.label} className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50 mb-1">{c.label}</p>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-[10px] text-[#d1d1d1]/30 mt-0.5">{c.sub}</p>
              </div>))}
            </div>
            <div className="space-y-2"><h3 className="font-serif italic text-white">Revenue vs Collections Monthly</h3>
              <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}>
                <XAxis dataKey="month" stroke={tc} fontSize={10} tick={{fill:tc,opacity:0.6}}/><YAxis stroke={tc} fontSize={10} tick={{fill:tc,opacity:0.6}} tickFormatter={v=>`${String.fromCharCode(8377)}${v/1000}k`}/>
                <Tooltip formatter={(v:any)=>[fmt(Number(v)),'']} contentStyle={tt}/>
                <Bar dataKey="revenue" name="Billed" fill="#2563eb" radius={[4,4,0,0]}/>
              </BarChart></ResponsiveContainer></div>
            </div>
            <div><h3 className="font-serif italic text-white mb-3">Profit and Loss Summary</h3>
              <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
                {[
                  {label:'Gross Revenue (Sales)',     value:totalRev,          color:'text-white'},
                  {label:'GST Collected',            value:totalTax,          color:'text-blue-500'},
                  {label:'Net Revenue (ex-GST)',     value:totalRev-totalTax, color:'text-white'},
                  {label:'Total Collected',          value:totalRec,          color:'text-emerald-500'},
                  {label:'Outstanding (Uncollected)',value:totalOut,          color:'text-rose-500'},
                ].map((row,i,arr)=>(
                  <div key={i} className={`flex justify-between items-center px-4 py-3 text-xs ${i<arr.length-1?'border-b border-white/5':''}`}>
                    <span className="text-[#d1d1d1]/70">{row.label}</span><span className={`font-bold ${row.color}`}>{fmt(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {section==='billing'&&(
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {label:'GST Sales',    value:fmt(gstRev),    sub:`${gstCount} invoices`,    color:'text-blue-500'},
                {label:'Non-GST Sales',value:fmt(nonGstRev), sub:`${nonGstCount} invoices`, color:'text-indigo-500'},
                {label:'GST Collected',value:fmt(totalTax),  sub:'CGST + SGST + IGST',      color:'text-rose-500'},
              ].map(c=>(<div key={c.label} className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50 mb-1">{c.label}</p>
                <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-[10px] text-[#d1d1d1]/30 mt-0.5">{c.sub}</p>
              </div>))}
            </div>

            {/* GST Type Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 font-bold">Filter:</span>
              {(['All', 'GST', 'Non-GST'] as const).map((gt) => (
                <button
                  key={gt}
                  onClick={() => setGstTypeFilter(gt)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                    gstTypeFilter === gt
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-[#1a1a1a] text-[#d1d1d1]/60 border border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {gt === 'All' ? 'All Invoices' : gt + ' Sales'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2"><h3 className="font-serif italic text-white">GST vs Non-GST Revenue</h3>
                <div className="h-52"><ResponsiveContainer width="100%" height="100%"><PieChart>
                  <Pie data={[{name:'GST Sales',value:gstRev},{name:'Non-GST Sales',value:nonGstRev}]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    <Cell fill="#2563eb"/><Cell fill="#6366f1"/>
                  </Pie>
                  <Tooltip formatter={(v:any)=>[fmt(Number(v)),'']} contentStyle={tt}/><Legend wrapperStyle={{fontSize:'10px',color:tc}}/>
                </PieChart></ResponsiveContainer></div>
              </div>
              <div className="space-y-2"><h3 className="font-serif italic text-white">Invoice Summary</h3>
                <div className="overflow-y-auto max-h-52 rounded-xl border border-white/10"><table className="w-full text-xs text-[#d1d1d1]">
                  <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 text-[10px] sticky top-0"><tr>
                    <th className="p-2.5 text-left">Invoice</th><th className="p-2.5">Type</th><th className="p-2.5 text-right">Taxable</th><th className="p-2.5 text-right">GST</th><th className="p-2.5 text-right">Total</th>
                  </tr></thead>
                  <tbody className="divide-y divide-white/5">{fi
                    .filter(inv => gstTypeFilter === 'All' || (gstTypeFilter === 'GST' && inv.isGstInvoice !== false) || (gstTypeFilter === 'Non-GST' && inv.isGstInvoice === false))
                    .map(inv=>(
                    <tr key={inv.id} className="hover:bg-white/5">
                      <td className="p-2.5 font-bold text-blue-500">{inv.invoiceNumber}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          inv.isGstInvoice === false
                            ? 'bg-slate-500/15 text-slate-400'
                            : 'bg-emerald-500/15 text-emerald-500'
                        }`}>
                          {inv.isGstInvoice === false ? 'Non-GST' : 'GST'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">{fmt(inv.taxableValue)}</td>
                      <td className="p-2.5 text-right text-rose-500">{fmt(inv.cgstTotal+inv.sgstTotal+inv.igstTotal)}</td>
                      <td className="p-2.5 text-right font-bold text-white">{fmt(inv.grandTotal)}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              </div>
            </div>
          </div>
        )}

        {section==='inventory'&&(
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2"><h3 className="font-serif italic text-white">Product Price Distribution</h3>
                <div className="h-60"><ResponsiveContainer width="100%" height="100%"><BarChart data={prodData} layout="vertical">
                  <XAxis type="number" stroke={tc} fontSize={10} tickFormatter={v=>`${String.fromCharCode(8377)}${v}`}/>
                  <YAxis type="category" dataKey="name" stroke={tc} fontSize={10} width={120} tick={{fill:tc,opacity:0.8}}/>
                  <Tooltip formatter={(v:any)=>[fmt(Number(v)),'Price']} contentStyle={tt}/>
                  <Bar dataKey="price" fill="#2563eb" radius={[0,4,4,0]}/>
                </BarChart></ResponsiveContainer></div>
              </div>
              <div className="space-y-2"><h3 className="font-serif italic text-white">Catalog Summary</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {prodData.map((p,i)=>(<div key={i} className="bg-[#1a1a1a] rounded-xl p-3.5 border border-white/5 flex justify-between items-center">
                    <div><p className="font-bold text-white text-xs">{p.name}</p><p className="text-[10px] text-[#d1d1d1]/40">HSN: {p.hsnCode} | GST: {p.gstRate}%</p></div>
                    <div className="text-right"><p className="font-bold text-blue-500">{fmt(p.price)}/{p.unit}</p><p className="text-[9px] text-[#d1d1d1]/40">Incl GST: {fmt(p.priceGst)}</p></div>
                  </div>))}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full text-xs text-[#d1d1d1]">
              <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest border-b border-white/10"><tr>
                <th className="p-3 text-left">Product Name</th><th className="p-3">Category</th><th className="p-3">HSN Code</th><th className="p-3 text-right">GST Rate</th><th className="p-3 text-right">Selling Price</th>
              </tr></thead>
              <tbody className="divide-y divide-white/5">{prodData.map((p,i)=>(
                <tr key={i} className="hover:bg-white/5 transition">
                  <td className="p-3 font-bold text-white">{p.name}</td><td className="p-3 text-[#d1d1d1]/60">{p.category}</td>
                  <td className="p-3 text-[#d1d1d1]/60 font-mono">{p.hsnCode}</td><td className="p-3 text-right text-blue-500">{p.gstRate}%</td>
                  <td className="p-3 text-right font-bold text-white">{fmt(p.price)} / {p.unit}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </div>
        )}
      </div>
    </div>
  );
};
