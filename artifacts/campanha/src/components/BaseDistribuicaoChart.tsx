import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type DistribuicaoItem = {
  name: string;
  value: number;
  color: string;
};

export default function BaseDistribuicaoChart({ data }: { data: DistribuicaoItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={3}>
          {data.map((item) => (
            <Cell key={item.name} fill={item.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [`${value} pessoas`, ""]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
