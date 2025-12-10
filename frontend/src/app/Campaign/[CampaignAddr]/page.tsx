import ClientComponent from "./ClientComponent";
interface PageProps {
  params: Promise<{
    CampaignAddr: `0x${string}`;
  }>;
}
const page = async ({params}: PageProps) => {
  const { CampaignAddr } = await params;

  return (
    <ClientComponent campaignAddress={CampaignAddr} />
  )
}

export default page