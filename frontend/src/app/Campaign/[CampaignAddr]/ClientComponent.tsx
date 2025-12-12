'use client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Item, ItemDescription, ItemActions, ItemContent, ItemTitle} from "@/components/ui/item";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { contractAbiCampaign, usdcAddress, usdcAbi } from "@/constants";
import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";
import { publicClient } from "../../../../utils/client";
import  NotConnected from '@/components/shared/NotConnected';
import { parseAbiItem } from "viem";

interface CampaignDetails {
    name: string;
    description: string;
    artist: `0x${string}`;
    fundsGoal: bigint;
    fundsRaised: bigint;
    deadline: bigint;
    startTime: bigint;
    isCompleted: boolean;
    initialSupply: bigint;
}
interface EventLog {
    contributor: string | undefined;
    amount: number;
}
interface TokenArt {
    name: string;
    symbol: string;
    Address: string;
}

const ClientComponent =   (props: { campaignAddress: `0x${string}` }) => {
    const { campaignAddress } =  props;
    const [campaignDetails, setCampaignDetails] = useState<CampaignDetails | null>(null);
    const [timestamp, setTimestamp] = useState<number>(0);
    const { address, isConnected} = useAccount();
    const [amount, setAmount] = useState<number>(0);
    const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
    const [tokenArt, setTokenArt] = useState<TokenArt>({
        name: '',
        symbol: '',
        Address: '0x0000000000000000000000000000000000000000',
    });

    const {data : ownerAddress, isError: errorReadOwner, isPending, refetch} = useReadContract({
        address: campaignAddress,
        abi: contractAbiCampaign,
        functionName: "owner"
    });
    const {data : campaignData, isFetched, refetch: refetchCampaignData} = useReadContract({
        address: campaignAddress,
        abi: contractAbiCampaign,
        functionName: "getCampaignDetails"
    });

    const fetchEvents = async () => {
        const currentBlock = await publicClient.getBlockNumber();
        const logs = await publicClient.getLogs({
            address: campaignAddress,
            event: parseAbiItem('event ContributionDone(address contributor, uint256 amount)'),
            fromBlock: currentBlock - 999n,
            toBlock: currentBlock,
        });
        const parsedLogs = (await logs).map(log => ({
            contributor: log.args.contributor,
            amount: Number(log.args.amount)
        }));
        setEventLogs(parsedLogs);
    };
    const { data: hashStart, error: errorStart, isPending: isPendingStart, isSuccess: isSuccessStart, writeContract: writeStartCampaign } = useWriteContract()
    const { isLoading: isLoadingStart, isSuccess: isConfirmedStart } = useWaitForTransactionReceipt({hash: hashStart})
    const startCampaign = () => {
        writeStartCampaign({
            address: campaignAddress,
            abi: contractAbiCampaign,
            functionName: 'startCampaign',
            });
    };
    
    const {data: hashComplete, error: errorComplete, isPending: isPendingComplete, isSuccess: isSuccessComplete, writeContract: writeComplete } = useWriteContract()
    const { isLoading: isLoadingComplete, isSuccess: isConfirmedComplete } = useWaitForTransactionReceipt({hash: hashComplete})
    const completeCampaign = () => {
        writeComplete({
            address: campaignAddress,
            abi: contractAbiCampaign,
            functionName: 'withdrawFunds',
            });
    };

    const {data: hashWithdraw, error: errorWithdraw, isPending: isPendingWithdraw, isSuccess: isSuccessWithdraw, writeContract: writeWithdraw } = useWriteContract()
    const { isLoading: isLoadingWithdraw, isSuccess: isConfirmedWithdraw } = useWaitForTransactionReceipt({hash: hashWithdraw})
    const withdrawContributions = () => {
        writeWithdraw({
            address: campaignAddress,
            abi: contractAbiCampaign,
            functionName: 'withdrawIncompleteCampaign',
            });
    };

    const {data: hashContribute, error: errorContribute, isPending: isPendingContribute, isSuccess: isSuccessContribute, writeContract: writeContribute } = useWriteContract()
    const { isLoading: isLoadingContribute, isSuccess: isConfirmedContribute } = useWaitForTransactionReceipt({hash: hashContribute})
    const {data: hashApprove, error: errorApprove, isPending: isPendingApprove, isSuccess: isSuccessApprove, writeContract: writeApprove } = useWriteContract()
    const { isLoading: isLoadingApprove, isSuccess: isConfirmedApprove } = useWaitForTransactionReceipt({hash: hashApprove})
    const contribute = () => {
            writeApprove({
            address: usdcAddress,
            abi: usdcAbi,
            functionName: 'approve',
            args: [campaignAddress, BigInt(amount*(10**6))],
            });  
    }
    const writeToContribute = () => {
        writeContribute({
            address: campaignAddress,
            abi: contractAbiCampaign,
            functionName: 'contribute',
            args: [BigInt(amount)],
            });
    }
    useEffect(() => {
        if (isConfirmedApprove) {
            writeToContribute();
        }
    }, [isConfirmedApprove]);

    const {data: hashCreateToken, error: errorCreateToken, isPending: isPendingCreateToken, isSuccess: isSuccessCreateToken, writeContract: writeCreateToken } = useWriteContract()
    const { isLoading: isLoadingCreateToken, isSuccess: isConfirmedCreateToken } = useWaitForTransactionReceipt({hash: hashCreateToken})
    const {data: tokenArtData,  refetch: refetchTokenArt} = useReadContract({
        address: campaignAddress,
        abi: contractAbiCampaign,
        functionName: "getTokenArt",
    });

    const createToken = () => {
        if (tokenArt.name.trim() === '' || tokenArt.symbol.trim() === '') {
            toast.error("Token name and symbol cannot be empty");
            return;
        }
        writeCreateToken({
            address: campaignAddress,
            abi: contractAbiCampaign,
            functionName: 'createTokenArt',
            args: [tokenArt.name, tokenArt.symbol],
            });
    }

    const {data: hashDistributeToken, error: errorDistributeToken, isPending: isPendingDistributeToken, isSuccess: isSuccessDistributeToken, writeContract: writeDistributeToken } = useWriteContract()
    const { isLoading: isLoadingDistributeToken, isSuccess: isConfirmedDistributeToken } = useWaitForTransactionReceipt({hash: hashDistributeToken})
    const distributeToken = () => {
        writeDistributeToken({
            address: campaignAddress,
            abi: contractAbiCampaign,
            functionName: 'distributeTokens',
            });
    }  

    useEffect(() => {
        if (isPendingStart || isPendingApprove || isPendingContribute || isPendingComplete || isPendingWithdraw || isPendingCreateToken || isPendingDistributeToken || isLoadingStart || isLoadingApprove || isLoadingContribute || isLoadingComplete || isLoadingWithdraw || isLoadingCreateToken || isLoadingDistributeToken) {
        toast.loading('Transaction pending...');
        } else if (!isPendingStart && !isPendingApprove && !isPendingContribute && !isPendingComplete && !isPendingWithdraw && !isPendingCreateToken && !isPendingDistributeToken && !isLoadingStart && !isLoadingApprove && !isLoadingContribute && !isLoadingComplete && !isLoadingWithdraw && !isLoadingCreateToken && !isLoadingDistributeToken) {
            toast.dismiss();
        }
    }, [isPendingStart, isPendingApprove, isPendingContribute, isPendingComplete, isPendingWithdraw, isPendingCreateToken, isPendingDistributeToken, isLoadingStart, isLoadingApprove, isLoadingContribute, isLoadingComplete, isLoadingWithdraw, isLoadingCreateToken, isLoadingDistributeToken]);

    useEffect(() => {
        const fetchTimestamp = async () => {
            const block = await publicClient.getBlock();
            setTimestamp(Number(block.timestamp));
        };
        fetchTimestamp();
        fetchEvents();
    }, []);

    useEffect(() => {
        if(tokenArtData){
            const data = tokenArtData as TokenArt;
            setTokenArt({
                ...tokenArt,
                name: data.name,
                symbol: data.symbol,
                Address: data.Address,
            });
        }
    }, [tokenArtData]);

    useEffect(() => {
    if (isConfirmedCreateToken) {
        refetchTokenArt();
    }
}, [isConfirmedCreateToken, refetchTokenArt]);

    useEffect(() => {
        const fetchCampaignData = async () => {
            try {
                const data = await refetchCampaignData();
                setCampaignDetails(campaignData as CampaignDetails);
            } catch (error) {
                toast.error("Failed to fetch campaign details");
            }
        };
        fetchCampaignData();
    }, [isFetched]);
    useEffect(() => {
        if (errorStart) {
            toast.error(`Transaction failed: ${errorStart.message}`);
        } else if (isSuccessStart) {
            toast.success('Transaction to start campaign submitted successfully!');
            refetchCampaignData();
            setCampaignDetails(campaignData as CampaignDetails);
        }  
    }, [errorStart, isConfirmedStart]);
    useEffect(() => {
        if (errorComplete) {
            toast.error(`Transaction failed: ${errorComplete.message}`);
        } else if (isSuccessComplete) {
            toast.success('Transaction to complete campaign submitted successfully!');
            refetchCampaignData();
            setCampaignDetails(campaignData as CampaignDetails);
        }  
    }, [errorComplete, isConfirmedComplete]);
    useEffect(() => {
        if (errorWithdraw) {
            toast.error(`Transaction failed: ${errorWithdraw.message}`);
        } else if (isSuccessWithdraw) {
            toast.success('Transaction to withdraw contributions submitted successfully!');
            refetchCampaignData();
            setCampaignDetails(campaignData as CampaignDetails);
        }  
    }, [errorWithdraw, isConfirmedWithdraw]);
    useEffect(() => {
        if (errorContribute) {
            toast.error(`Transaction failed: ${errorContribute.message}`);
        } else if (isSuccessContribute) {
            toast.success('Contribution submitted successfully!');
            refetchCampaignData();
            setCampaignDetails(campaignData as CampaignDetails);
        }  
    }, [errorContribute, isConfirmedContribute]);

    useEffect(() => {
        if (errorApprove) {
            toast.error(`Transaction failed: ${errorApprove.message}`);
        } else if (isSuccessApprove) {
            toast.success('Approve submitted successfully!');
        }  
    }, [errorApprove, isConfirmedApprove]);

    useEffect(() => {
        if (errorCreateToken) {
            toast.error(`Transaction failed: ${errorCreateToken.message}`);
        } else if (isSuccessCreateToken) {
            toast.success('Art Token creation submitted successfully!');
        }  
    }, [errorCreateToken, isConfirmedCreateToken]);
    
    useEffect(() => {
        if (errorDistributeToken) {
            toast.error(`Transaction failed: ${errorDistributeToken.message}`);
        } else if (isSuccessDistributeToken) {
            toast.success('Art Token distribution submitted successfully!');
        }  
    }, [errorDistributeToken, isConfirmedDistributeToken]);

  return (
    <div className="min-h-screen">
        <div>
            {!isConnected ?(<NotConnected />) : (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex justify-center mb-8">
                    <h1 className="text-5xl font-bold text-center bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent px-4 py-2">
                        {campaignDetails?.name}
                    </h1>
                </div>
                <div>
                    {campaignDetails?.startTime ? (
                        timestamp > Number(campaignDetails?.startTime) + Number(campaignDetails?.deadline) ? (
                            campaignDetails?.isCompleted ? (
                                <div>
                                <Alert className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 shadow-lg">
                                    <AlertTitle className="font-bold text-2xl text-green-700">✅ Campaign Completed</AlertTitle>
                                    <AlertDescription className="text-xl text-green-600">
                                        This campaign has successfully ended and all funds have been distributed.
                                    </AlertDescription>
                                </Alert>
                                {ownerAddress?.toString() === address?.toString() && (
                                    <Item className="mb-6 border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
                                        <ItemContent>
                                            <ItemTitle className="text-xl font-bold mb-2 text-green-700">Complete Campaign</ItemTitle>
                                            <ItemDescription className="mb-4 text-green-600">You are the owner. Finalize this campaign to distribute funds.</ItemDescription>
                                        </ItemContent>
                                        <ItemActions>
                                                <Button onClick={() => {completeCampaign()}} disabled={isLoadingComplete} className="bg-green-600 hover:bg-green-700">
                                                    {isLoadingComplete ? 'Processing...' : 'Complete Campaign'}
                                                </Button>
                                        </ItemActions>
                                    </Item>)}
                                </div>
                            ) : (
                                <div>
                                <Alert className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-500 shadow-lg">
                                    <AlertTitle className="font-bold text-2xl text-red-700">⚠️ Campaign Ended</AlertTitle>
                                    <AlertDescription className="text-xl text-red-600">
                                        This campaign has ended but was not completed successfully.
                                    </AlertDescription>
                                </Alert>
                                
                                {ownerAddress?.toString() === address?.toString() && (
                                    <Item className="mb-6 border-2 border-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-lg">
                                        <ItemContent>
                                            <ItemTitle className="text-xl font-bold mb-2 text-yellow-700">Withdraw Contributions</ItemTitle>
                                            <ItemDescription className="mb-4 text-yellow-600">Campaign incomplete. Withdraw contributions back to contributors.</ItemDescription>
                                        </ItemContent>
                                        <ItemActions>
                                                <Button onClick={() => {withdrawContributions()}} disabled={isLoadingWithdraw} variant="outline" className="border-yellow-500 text-yellow-700 hover:bg-yellow-100">
                                                    {isLoadingWithdraw ? 'Processing...' : 'Withdraw Contributions'}
                                                </Button>
                                        </ItemActions>
                                    </Item>)}
                                
                                </div>
                            )
                        ) : (
                                <Alert className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-primary shadow-lg">
                                    <AlertTitle className="font-bold text-2xl text-primary">🚀 Campaign Active</AlertTitle>
                                    <AlertDescription className="text-xl text-primary/80">
                                        This campaign is currently ongoing. Contribute now!
                                    </AlertDescription>
                                </Alert>
                        
                    )) : (
                        ownerAddress?.toString() === address?.toString() ? (
                            <Item className="mb-6 border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
                                <ItemContent>
                                    <ItemTitle className="text-xl font-bold mb-2 text-green-700">🚀 Start Campaign</ItemTitle>
                                    <ItemDescription className="mb-4 text-green-600">You are the owner. Launch this campaign to allow contributions.</ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                        <Button onClick={() => startCampaign()} disabled={isLoadingStart} className="bg-green-600 hover:bg-green-700">
                                            {isLoadingStart ? 'Starting...' : 'Start Campaign'}
                                        </Button>
                                </ItemActions>
                            </Item>
                        ) : (
                        <Alert className="mb-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-500 shadow-lg">
                            <AlertTitle className="font-bold text-2xl text-yellow-700">⏳ Not Started</AlertTitle>
                            <AlertDescription className="text-xl text-yellow-600">
                                This campaign has not been started yet. Please wait for the owner to launch it.
                            </AlertDescription>
                        </Alert>
                    ))}
                </div>
            
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-2 border-primary/20 shadow-xl">
                            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
                                <CardTitle className="text-2xl text-primary">Campaign Details</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Campaign Name</p>
                                        <p className="font-semibold text-lg">{campaignDetails?.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Current Time</p>
                                        <p className="font-mono text-sm">{new Date(timestamp * 1000).toLocaleString()}</p>
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Description</p>
                                    <p className="text-base">{campaignDetails?.description}</p>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Artist Address</p>
                                        <p className="font-mono text-sm">{campaignDetails?.artist}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Funding Goal</p>
                                        <p className="text-xl font-bold text-primary">{Number(campaignDetails?.fundsGoal)} <span className="text-sm">USDC</span></p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Funds Raised</p>
                                        <p className="text-xl font-bold text-accent">{Number(campaignDetails?.fundsRaised)} <span className="text-sm">USDC</span></p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Initial Token Supply</p>
                                        <p className="font-semibold">{Number(campaignDetails?.initialSupply)}</p>
                                    </div>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Start Time</p>
                                        <p className="font-mono text-sm">{campaignDetails?.startTime ? new Date(Number(campaignDetails?.startTime) * 1000).toLocaleString() : "Not Started yet"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Deadline</p>
                                        <p className="font-mono text-sm">{campaignDetails?.deadline ? new Date((timestamp + Number(campaignDetails.deadline)) * 1000).toLocaleString() : "N/A"}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    <p className="font-semibold">{campaignDetails?.isCompleted ? "✅ Completed" : "⏳ In Progress"}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-2 border-primary/20 shadow-xl">
                            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
                                <CardTitle className="text-2xl text-primary">💰 Contributions</CardTitle>
                            </CardHeader>
                            <CardContent>
                            {eventLogs.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-primary/20 rounded-lg">
                                    <p className="text-muted-foreground">No contributions yet. Be the first to contribute!</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {eventLogs.map((log, index) => (
                                        <Card key={index} className="border-1 border-accent/20 bg-gradient-to-r from-accent/5 to-primary/5">
                                            <CardContent className="pl-4 flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Contributor</p>
                                                    <p className="font-mono text-sm">{log.contributor?.slice(0, 10)}...{log.contributor?.slice(-8)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground mb-1">Amount</p>
                                                    <p className="text-xl font-bold text-accent">{log.amount} <span className="text-sm">USDC</span></p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-6">{/* Sidebar with info and actions */}
                        <Card className="border-2 border-primary/20 shadow-xl">
                            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
                                <CardTitle className="text-xl text-primary">🎯 Campaign Progress</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-muted-foreground">Funding Progress</span>
                                        <span className="text-sm font-semibold text-primary">
                                            {campaignDetails?.fundsRaised != null && campaignDetails.fundsGoal > 0n ? Number((campaignDetails.fundsRaised * 100n) / campaignDetails.fundsGoal) : 0}%
                                        </span>
                                    </div>
                                    <Progress value={campaignDetails?.fundsRaised != null && campaignDetails.fundsGoal > 0n ? Math.min(Number((campaignDetails.fundsRaised * 100n) / campaignDetails.fundsGoal), 100) : 0} className="mb-2 h-3 bg-primary/20 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent"/>
                                    <div className="flex justify-between">
                                        <span className="text-lg font-bold text-accent">{campaignDetails?.fundsRaised != null ? Number(campaignDetails.fundsRaised) : 0} USDC</span>
                                        <span className="text-sm text-muted-foreground">of {campaignDetails?.fundsGoal != null ? Number(campaignDetails.fundsGoal) : 0} USDC</span>
                                    </div>
                                </div>
                                <Separator className="my-4" />
                                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">⏰ Time Remaining</p>
                                        <p className="text-2xl font-bold text-primary">{(campaignDetails?.startTime && campaignDetails?.deadline) ? Math.max(0, Math.trunc((((Number(campaignDetails.startTime) + Number(campaignDetails.deadline)) - timestamp))/(36*24)))/100 : 0}</p>
                                        <p className="text-sm text-muted-foreground">days</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-2 border-accent/20 shadow-xl">
                            <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/10">
                                <CardTitle className="text-xl text-accent">💰 Contribute Now</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <p className="mb-4 text-muted-foreground">Support <strong>{campaignDetails?.name}</strong> by contributing:</p>
                                <CardAction>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <Button className="border-1 border-accent/30 hover:border-accent hover:bg-accent/10" variant="outline" onClick={()=> setAmount(10)}>10 USDC</Button>
                                        <Button className="border-1 border-accent/30 hover:border-accent hover:bg-accent/10" variant="outline" onClick={()=> setAmount(50)}>50 USDC</Button>
                                        <Button className="border-1 border-accent/30 hover:border-accent hover:bg-accent/10" variant="outline" onClick={()=> setAmount(100)}>100 USDC</Button>
                                        <Button className="border-1 border-accent/30 hover:border-accent hover:bg-accent/10" variant="outline" onClick={()=> setAmount(500)}>500 USDC</Button>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <Input className="border-1 border-accent/30 focus:border-accent" placeholder={`Custom amount: ${amount || 0} USDC`}  onChange={(e) => setAmount(Number(e.target.value) || 0)} />
                                        <Button className="w-full bg-accent hover:bg-accent/90 text-lg py-6" disabled={isLoadingContribute} onClick={()=> contribute()}>
                                            {isLoadingContribute ? 'Processing...' : `Contribute ${amount || 0} USDC`}
                                        </Button>
                                    </div>
                                </CardAction>
                            </CardContent>
                        </Card>
                        {(ownerAddress?.toString() === address?.toString() && campaignDetails?.isCompleted) && (
                        <Card className="border-2 border-green-500 shadow-xl">
                            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                                <CardTitle className="text-xl text-green-700">🎨 Art Token Creation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(tokenArt.Address !== '0x0000000000000000000000000000000000000000' && tokenArt.Address !== undefined) ? (
                                    <div className="p-4 bg-green-50 border-1 border-green-500 rounded-lg">
                                        <p className="text-sm text-green-600 mb-2">✅ Token Created</p>
                                        <p className="font-mono text-xs break-all text-green-700">{tokenArt.Address}</p>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground mb-4">Create an art token for this campaign's supporters.</p>
                                )}
                            </CardContent>
                            <CardAction className="grid grid-cols-2 gap-3 p-6 pt-0">
                                    <Input className="border-2 border-green-500/30" placeholder="Token Name" onChange={(e)=> setTokenArt({...tokenArt, name: e.target.value})}/>
                                    <Input className="border-2 border-green-500/30" placeholder="Symbol" onChange={(e)=> setTokenArt({...tokenArt, symbol: e.target.value})}/>
                                    <Button className="bg-green-600 hover:bg-green-700" onClick={()=> createToken()} disabled={(tokenArt.Address !== '0x0000000000000000000000000000000000000000' && tokenArt.Address !== undefined) || isLoadingCreateToken}>
                                        {isLoadingCreateToken ? 'Creating...' : '1 - Create Token'}
                                    </Button>
                                    <Button className="bg-green-600 hover:bg-green-700" onClick={()=> distributeToken() } disabled={tokenArt.Address === '0x0000000000000000000000000000000000000000' || tokenArt.Address === undefined || isLoadingDistributeToken}>
                                        {isLoadingDistributeToken ? 'Distributing...' : '2 - Distribute'}
                                    </Button>
                            </CardAction>
                        </Card>
                        )}
                    </div>
                </div>
            </div>
            )}
        </div>
    </div>
  )
}

export default ClientComponent