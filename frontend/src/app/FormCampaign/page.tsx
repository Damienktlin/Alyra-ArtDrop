'use client';
import {Field,FieldDescription,FieldGroup,FieldLabel,FieldLegend,FieldSeparator,FieldSet} from "@/components/ui/field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { contractAddress, contractAbiArtdrop } from "@/constants";
import { publicClient } from "../../../utils/client";
import { parseAbiItem } from "viem";
import Link from "next/link";
import  NotConnected from '@/components/shared/NotConnected';

interface CampaignFormData {
    campaignName: string;
    campaignDescription: string;
    artistAddress: string;
    fundingGoal: number; // in USDC
    initialSupply: number; //with all decimals
    deadline: number; // in weeks
}
interface EventLog {
    id: number | undefined;
    name: string | undefined;
    address: string | undefined;
}

const page = () => {
    const { isConnected } = useAccount();
    const [campaignData, setCampaignData] = useState<CampaignFormData>({
        campaignName: '',
        campaignDescription: '',
        artistAddress: '',
        fundingGoal: 0,
        initialSupply: 0,
        deadline: 0,
    });
    const [eventLogs, setEventLogs] = useState<EventLog[]>([]);

    const {data: hash, error, isPending, isSuccess, writeContract} = useWriteContract();
    const { isLoading, isSuccess: isConfirmed } = useWaitForTransactionReceipt({hash});
    const createCampaign = () => {
        writeContract({
            address: contractAddress,
            abi: contractAbiArtdrop,
            functionName: 'createCampaign',
            args: [
                campaignData.campaignName,
                campaignData.campaignDescription,
                campaignData.artistAddress,
                BigInt(campaignData.fundingGoal),
                BigInt(campaignData.deadline), // convert weeks to seconds
                BigInt(campaignData.initialSupply)
            ],
        });
    };

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
        } else if (isConfirmed) {
            toast.success('Campaign created successfully!');
            getEvents();
        }
    }, [error, isConfirmed]);
    useEffect(() => {
        console.log("Fetching events...");
        getEvents();
    }, []);

  return (
    <div className="min-h-screen py-8"> {!isConnected ? (
        <NotConnected />
    ) : (
        <div className="w-full max-w-4xl mx-auto px-4">
            <h1 className="title text-center mb-8">Create New Campaign</h1>
            <form action="">
                <FieldGroup className="border-2 border-primary/20 rounded-lg p-8 bg-card shadow-xl">
                    <FieldSet>
                        <FieldLegend className="text-2xl font-bold text-primary mb-6">Campaign Details</FieldLegend>
                    </FieldSet>
                    <Field>
                        <FieldLabel>Campaign Name</FieldLabel>
                        <FieldDescription>
                            Name of the campaign.
                        </FieldDescription>
                        <FieldGroup>
                            <Input type="text" id="campaignName" placeholder="Enter Campaign Name" onChange={(e) => setCampaignData({...campaignData, campaignName: e.target.value})} />
                        </FieldGroup>
                    </Field>
                    <Field>
                        <FieldLabel>Campaign Description</FieldLabel>
                        <FieldDescription>
                            Short description of the campaign.
                        </FieldDescription>
                        <FieldGroup>
                            <Input type="text" id="campaignDescription" placeholder="Enter Campaign Description" onChange={(e) => setCampaignData({...campaignData, campaignDescription: e.target.value})} />
                        </FieldGroup>
                    </Field>
                    <Field>
                        <FieldLabel>Artist Address</FieldLabel>
                        <FieldDescription>
                            Address of the artist.
                        </FieldDescription>
                        <FieldGroup>
                            <Input type="text" id="artistAddress" placeholder="0x1234...abcd" onChange={(e) => setCampaignData({...campaignData, artistAddress: e.target.value})} />
                        </FieldGroup>
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel>Funding Goal (in USDC)</FieldLabel>
                            <FieldDescription>
                                Target amount to be raised in USDC.
                            </FieldDescription>
                            <FieldGroup>
                                <Input type="number" id="fundingGoal" placeholder="1000" onChange={(e) => setCampaignData({...campaignData, fundingGoal: Number(e.target.value)})} />
                            </FieldGroup>
                        </Field>
                        <Field>
                            <FieldLabel>Initial supply</FieldLabel>
                            <FieldDescription>
                                Initial supply of the reward without the decimals.
                            </FieldDescription>
                            <FieldGroup>
                                <Input type="number" id="initialSupply" placeholder="Enter initial supply" onChange={(e) => setCampaignData({...campaignData, initialSupply: Number(e.target.value)})} />
                            </FieldGroup>
                        </Field>
                    </div>
                    <Field>
                        <FieldLabel>Deadline</FieldLabel>
                        <FieldDescription>
                            Campaign deadline date in weeks.
                        </FieldDescription>
                        <FieldGroup>
                            <Input type="number" id="deadline" placeholder="Enter a number of weeks until deadline" onChange={(e) => setCampaignData({...campaignData, deadline: Number(e.target.value)})}/>
                        </FieldGroup>
                    </Field>
                    
                    <Button type="submit" onClick={()=> createCampaign()} disabled={isLoading} className="w-full mt-6 bg-primary hover:bg-primary/90 text-lg py-6">
                        {isLoading ? 'Creating Campaign...' : 'Create Campaign'}
                    </Button>
                    
                </FieldGroup>
                <div className="mt-6 flex flex-col gap-3">
                        <Link href={"/"} className={buttonVariants({size:"lg", variant:"outline"})} >← Back to Home</Link>
                    { eventLogs.length > 0 &&
                        <Link href={`/Campaign/${eventLogs[eventLogs.length-1].address}`} className={buttonVariants({size:"lg", variant:"default"})}>View Latest Campaign →</Link>
                        }
                    
                </div>
            </form>
            <div className="mt-12">
                <h2 className="text-3xl font-bold mb-6 text-primary">All Campaigns</h2>
                {eventLogs.length === 0 ? (
                    <div className="text-center py-12 bg-card border-2 border-dashed border-primary/30 rounded-lg">
                        <p className="text-muted-foreground text-lg">No campaigns created yet. Be the first!</p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {eventLogs.map((log) => (
                            <li key={log.id?.toString()} className="p-6 bg-card border-2 border-primary/20 rounded-lg hover:border-primary/40 transition-all hover:shadow-lg">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <strong className="text-primary">Campaign ID:</strong>
                                        <p className="font-mono">{log.id?.toString()}</p>
                                    </div>
                                    <div>
                                        <strong className="text-primary">Name:</strong>
                                        <p>{log.name}</p>
                                    </div>
                                    <div>
                                        <strong className="text-primary">Address:</strong>
                                        <p className="font-mono text-sm truncate">{log.address}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
        )}
    </div>
  )
}

export default page