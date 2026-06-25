type DisputePageProps = {
  params: Promise<{ id: string }>;
};

export default async function DisputePage({ params }: DisputePageProps) {
  const { id } = await params;
  return (
    <section className="grid">
      <div className="panel">
        <h2>Dispute</h2>
        <p className="mono">{id}</p>
        <p className="muted">Here you can view the case background, authorized evidence, and the final resolution.</p>
      </div>
    </section>
  );
}
