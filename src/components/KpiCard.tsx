type Props = {
  label: string;
  value: string | number;
  trend: string;
};

export function KpiCard({ label, value, trend }: Props) {
  return (
    <article className="card kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{trend}</small>
    </article>
  );
}
