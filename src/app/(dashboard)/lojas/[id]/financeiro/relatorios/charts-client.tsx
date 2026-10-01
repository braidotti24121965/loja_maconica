"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type ChartData = {
  month: string;
  receitas: number;
  despesas: number;
  inadimplencias: number;
};

export default function ChartsClient({ data }: { data: ChartData[] }) {
  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} tickFormatter={(val) => `R$ ${val}`} />
          <Tooltip 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            cursor={{ fill: '#f3f4f6' }}
            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend wrapperStyle={{ paddingTop: 20 }} />
          <Bar dataKey="receitas" name="Receitas" fill="#0f766e" radius={[4, 4, 0, 0]} maxBarSize={50} />
          <Bar dataKey="despesas" name="Despesas" fill="#c2414b" radius={[4, 4, 0, 0]} maxBarSize={50} />
          <Bar dataKey="inadimplencias" name="Inadimplência" fill="#d97706" radius={[4, 4, 0, 0]} maxBarSize={50} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
