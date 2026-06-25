type BountyPageProps = {
  params: Promise<{ address: string }>;
};

export default async function BountyPage({ params }: BountyPageProps) {
  const { address } = await params;
  return (
    <section className="grid">
      <div className="panel">
        <h2>Bounty</h2>
        <p className="mono">{address}</p>
        <p className="muted">Here you can view the bounty details, scope, and the status of associated reports.</p>
      </div>
    </section>
  );
}
