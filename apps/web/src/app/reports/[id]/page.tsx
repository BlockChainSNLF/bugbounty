type ReportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  return (
    <section className="grid">
      <div className="panel">
        <h2>Reporte</h2>
        <p className="mono">{id}</p>
        <p className="muted">Acá vas a poder revisar el estado del hallazgo, su evidencia asociada y el historial de decisiones.</p>
      </div>
    </section>
  );
}
