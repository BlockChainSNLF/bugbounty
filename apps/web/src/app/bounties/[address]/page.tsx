type BountyPageProps = {
  params: Promise<{ address: string }>;
};

export default async function BountyPage({ params }: BountyPageProps) {
  const { address } = await params;
  return (
    <section className="grid">
      <div className="panel">
        <h2>Programa</h2>
        <p className="mono">{address}</p>
        <p className="muted">Acá vas a poder consultar el detalle del programa, su alcance y el estado de los reportes asociados.</p>
      </div>
    </section>
  );
}
