'use client';
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Link from "next/link";
import { contractAddress, contractAbiArtdrop, usdcAddress, usdcAbi } from "@/constants";
import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";
import { publicClient } from "../../../utils/client";
import { parseAbiItem } from "viem";

interface EventLog {
    id: number | undefined;
    name: string | undefined;
    address: string | undefined;
}

const Main = () => {
  const multiplier = 10 ** 6; // USDC has 6 decimals
  const [Addr, setAddr] = useState<string>("");
  const [Amount, setAmount] = useState<string>("");
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);

  const { address } = useAccount();
  const {data : ownerAddress, isError: errorReadOwner, refetch: refetchOwner} = useReadContract({
        address: contractAddress,
        abi: contractAbiArtdrop,
        functionName: "owner"
    });
  const { data, refetch} = useReadContract({
    address: usdcAddress,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: [address],
  });
  const { data: hash, error, isPending, isSuccess, writeContract: Mint } = useWriteContract()
  const { isLoading, isSuccess: isConfirmedMint } = useWaitForTransactionReceipt({hash})


  const MintUSDC = async (addr: string, amount: string) => {
    Mint({
        address: usdcAddress,
        abi: usdcAbi,
        functionName: 'mint',
        args: [Addr, BigInt(Amount)],
      })
  }

  const getEvents = async () => {
          const eventLog = publicClient.getLogs({
              address: contractAddress,
              event: parseAbiItem('event CampaignCreated(uint32 campaignId, string name, address campaignAddress)'),
              fromBlock: 9815965n,
              toBlock: 'latest',
          });
          const formattedEvents = (await eventLog).map(log => ({
              id: log.args.campaignId,
              name: log.args.name,
              address: log.args.campaignAddress,
              }));
          setEventLogs(formattedEvents);
      }

  useEffect(() => {
    if (error) {
      toast.error(`Transaction failed: ${error.message}`);
    } else if (isSuccess) {
      toast.success('Transaction submitted successfully!');
      refetch();
    }  
  }, [error, isConfirmedMint]);

  useEffect(() => {
    refetchOwner();
    getEvents();
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center py-12 px-4">
        <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
          ArtDrop
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-2">
          Fund Creative Projects with <span className="text-accent font-semibold">Web3</span>
        </p>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
          Support artists and creators through decentralized crowdfunding. Contribute with USDC and earn exclusive art tokens as rewards and more.
        </p>
      </div>

      <div>
        <Card className="border-1 border-primary/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
            <CardTitle className="text-2xl text-primary">Test USDC Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-secondary/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Your Balance</p>
              <p className="text-3xl font-bold text-primary">{Number(data || 0n) / multiplier} <span className="text-lg text-muted-foreground">mUSDC</span></p>
              <p className="text-xs text-muted-foreground mt-1">Address: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
            </div>
            <p className="font-semibold mb-4 text-lg">Mint Test USDC</p>
            <div className="flex flex-row gap-3">
              <Input placeholder="Recipient address" onChange={(e) => setAddr(e.target.value)} className="border-primary/30"/>
              <Input placeholder="Amount (with decimals)" onChange={(e) => setAmount(e.target.value)} className="border-primary/30"/>
              <Button onClick={()=> MintUSDC(Addr, Amount) } disabled={isLoading} className="bg-primary hover:bg-primary/90">
                {isLoading ? 'Minting...' : 'Mint USDC'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        {address?.toString()=== ownerAddress?.toString() && (
          <Card className="border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-accent flex items-center gap-2">
                <span className="text-3xl">👑</span> Owner Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div>
                <p className="font-semibold text-lg mb-1">You are the contract owner</p>
                <p className="text-sm text-muted-foreground">You have special privileges to create campaigns</p>
              </div>
              <Link className={buttonVariants({variant: "default", size: "lg"})} href="/FormCampaign">
                ➕ Create Campaign
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-8">
        <Card className="border-2 border-primary/20 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
            <CardTitle className="text-3xl font-bold text-primary">All Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {eventLogs.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-primary/30 rounded-lg">
                <p className="text-xl text-muted-foreground">No campaigns available yet.</p>
                <p className="text-sm text-muted-foreground mt-2">Create the first campaign to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {eventLogs.reverse().map((log) => (
                  <Card key={log.id} className="border-1 border-primary/20 hover:border-primary/40 transition-all hover:shadow-md">
                    <CardContent className="p-2 pl-10">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                              ID: {log.id}
                            </span>
                            <h3 className="text-xl font-bold text-primary">{log.name}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">
                            {log.address?.slice(0, 10)}...{log.address?.slice(-8)}
                          </p>
                        </div>
                        <Link 
                          className={buttonVariants({variant: "default", size: "lg"})} 
                          href={`/Campaign/${log.address}`}
                        >
                          View Campaign →
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Main