import { ReportDetail } from "../../../components/report-detail";

type ReportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  return <ReportDetail id={id} />;
}
