import { AlertCircleIcon, CheckCircle2Icon, PopcornIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const NotConnected = () => {
  return (
    <div>
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-2xl mx-auto p-6">
          <Alert variant="destructive" className="border-2 shadow-xl">
            <AlertCircleIcon className="h-5 w-5" />
            <AlertTitle className="text-2xl font-bold">Not Connected</AlertTitle>
            <AlertDescription className="text-lg mt-2">
              <p>Please connect your wallet to access the dApp.</p>
              <p className="mt-2 text-sm opacity-80">Click the "Connect Wallet" button in the navigation bar to get started.</p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}

export default NotConnected