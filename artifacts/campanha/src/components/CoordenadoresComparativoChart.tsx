import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type CoordenadorChartItem = {
  nome: string;
  total: number;
  fechados: number;
};

export default function CoordenadoresComparativoChart({
  data,
  primary,
}: {
  data: CoordenadorChartItem[];
  primary: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="nome" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Bar dataKey="total" fill={primary} radius={[8, 8, 0, 0]} />
        <Bar dataKey="fechados" fill="#10b981" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
