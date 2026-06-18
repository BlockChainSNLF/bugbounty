type DisputePageProps = {
  params: Promise<{ id: string }>;
};

export default async function DisputePage({ params }: DisputePageProps) {
  const { id } = await params;
  return (
    <section className="grid">
      <div className="panel">
        <h2>Disputa</h2>
        <p className="mono">{id}</p>
        <p className="muted">Acá vas a poder ver los antecedentes del caso, la evidencia autorizada y la resolución final.</p>
      </div>
    </section>
  );
}
