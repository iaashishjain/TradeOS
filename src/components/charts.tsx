"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/calculations";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4"];
const PROFIT_COLOR = "#22c55e";
const LOSS_COLOR = "#ef4444";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload?: Record<string, unknown> }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 text-xs space-y-1 !border-white/10">
      <p className="text-dark-300 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
}

export function EquityChart({ data }: { data: { date: string; equity: number }[] }) {
  if (!data.length) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c24" />
        <XAxis dataKey="date" stroke="#52526b" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis stroke="#52526b" tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="equity" stroke="#6366f1" fill="url(#equityGrad)" strokeWidth={2} name="Equity" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PnlBarChart({ data }: { data: { date: string; pnl: number }[] }) {
  if (!data.length) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c24" />
        <XAxis dataKey="date" stroke="#52526b" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis stroke="#52526b" tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#52526b" />
        <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.pnl >= 0 ? PROFIT_COLOR : LOSS_COLOR} opacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MarketPieChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function WinRateChart({ data }: { data: { name: string; winRate: number }[] }) {
  if (!data.length) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c24" />
        <XAxis type="number" stroke="#52526b" tick={{ fontSize: 11 }} domain={[0, 100]} />
        <YAxis dataKey="name" type="category" stroke="#52526b" tick={{ fontSize: 11 }} width={80} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="winRate" name="Win Rate %" fill="#6366f1" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CumulativePnlChart({ data }: { data: { date: string; pnl: number }[] }) {
  if (!data.length) return <ChartEmpty />;
  let cumulative = 0;
  const cumulativeData = data.map((d) => {
    cumulative += d.pnl;
    return { date: d.date, cumPnl: Math.round(cumulative * 100) / 100 };
  });
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={cumulativeData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c24" />
        <XAxis dataKey="date" stroke="#52526b" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis stroke="#52526b" tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#52526b" />
        <Line type="monotone" dataKey="cumPnl" stroke={PROFIT_COLOR} strokeWidth={2} dot={false} name="Cumulative P&L" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RDistributionChart({ data }: { data: { range: string; count: number; pnl: number }[] }) {
  if (!data.length) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c24" />
        <XAxis dataKey="range" stroke="#52526b" tick={{ fontSize: 10 }} />
        <YAxis stroke="#52526b" tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" name="Trades" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DecisionQualityRadar({
  data,
}: {
  data: { planAdherence: number; riskManagement: number; entryQuality: number; exitQuality: number; emotionalControl: number };
}) {
  const radarData = [
    { subject: "Plan", value: data.planAdherence },
    { subject: "Risk", value: data.riskManagement },
    { subject: "Entry", value: data.entryQuality },
    { subject: "Exit", value: data.exitQuality },
    { subject: "Emotion", value: data.emotionalControl },
  ];
  return (
    <ResponsiveContainer width="100%" height={250}>
      <RadarChart data={radarData}>
        <PolarGrid stroke="#1c1c24" />
        <PolarAngleAxis dataKey="subject" stroke="#52526b" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#52526b" tick={{ fontSize: 10 }} />
        <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function HourlyHeatmap({ data }: { data: { name: string; winRate: number; pnl: number; trades: number }[] }) {
  if (!data.length) return <ChartEmpty message="Trade more to see hourly patterns" />;
  
  const maxPnl = Math.max(...data.map((d) => Math.abs(d.pnl)), 1);
  
  return (
    <div className="grid grid-cols-12 gap-1">
      {Array.from({ length: 24 }, (_, hour) => {
        const hourData = data.find((d) => d.name === `${hour}:00`);
        const intensity = hourData ? hourData.pnl / maxPnl : 0;
        const bgColor = !hourData
          ? "bg-dark-800"
          : intensity > 0.3
          ? "bg-profit/40"
          : intensity > 0
          ? "bg-profit/20"
          : intensity < -0.3
          ? "bg-loss/40"
          : intensity < 0
          ? "bg-loss/20"
          : "bg-dark-700";
        
        return (
          <div
            key={hour}
            className={`aspect-square rounded ${bgColor} flex items-center justify-center text-[10px] text-dark-300 cursor-default group relative`}
            title={hourData ? `${hour}:00 - ${hourData.trades} trades, ${hourData.winRate}% WR, ${formatCurrency(hourData.pnl)}` : `${hour}:00 - No trades`}
          >
            {hour}
            {hourData && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 glass-card p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                <p className="font-medium text-white">{hour}:00</p>
                <p className="text-dark-300">{hourData.trades} trades</p>
                <p className="text-dark-300">{hourData.winRate}% win rate</p>
                <p className={hourData.pnl >= 0 ? "text-profit" : "text-loss"}>{formatCurrency(hourData.pnl)}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CalendarHeatmap({ data, year, month }: { data: { date: string; pnl: number; trades: number }[]; year: number; month: number }) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startPadding = firstDay.getDay();
  
  const maxPnl = Math.max(...data.map((d) => Math.abs(d.pnl)), 1);
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
  
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-dark-400">
        {dayNames.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPadding }, (_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayData = data.find((d) => d.date === dateStr);
          const intensity = dayData ? dayData.pnl / maxPnl : 0;
          const bgColor = !dayData
            ? "bg-dark-800/50"
            : intensity > 0.5
            ? "bg-profit"
            : intensity > 0.2
            ? "bg-profit/60"
            : intensity > 0
            ? "bg-profit/30"
            : intensity < -0.5
            ? "bg-loss"
            : intensity < -0.2
            ? "bg-loss/60"
            : intensity < 0
            ? "bg-loss/30"
            : "bg-dark-700";
          
          return (
            <div
              key={day}
              className={`aspect-square rounded ${bgColor} flex items-center justify-center text-[10px] ${dayData ? "text-white" : "text-dark-500"} cursor-default relative group`}
            >
              {day}
              {dayData && (
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 glass-card p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  <p className="font-medium text-white">{dateStr}</p>
                  <p className="text-dark-300">{dayData.trades} trades</p>
                  <p className={dayData.pnl >= 0 ? "text-profit" : "text-loss"}>{formatCurrency(dayData.pnl)}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PerformanceBarChart({
  data,
  valueKey = "pnl",
}: {
  data: { name: string; pnl: number; winRate: number; trades: number }[];
  valueKey?: "pnl" | "winRate";
}) {
  if (!data.length) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 35)}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c24" />
        <XAxis type="number" stroke="#52526b" tick={{ fontSize: 11 }} />
        <YAxis dataKey="name" type="category" stroke="#52526b" tick={{ fontSize: 11 }} width={100} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey={valueKey} name={valueKey === "pnl" ? "P&L" : "Win Rate"} radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={
                valueKey === "pnl"
                  ? entry.pnl >= 0
                    ? PROFIT_COLOR
                    : LOSS_COLOR
                  : entry.winRate >= 50
                  ? PROFIT_COLOR
                  : LOSS_COLOR
              }
              opacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartEmpty({ message = "No data to display yet. Add some trades to see charts." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-[250px] text-dark-400 text-sm">
      {message}
    </div>
  );
}
