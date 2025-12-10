import { AlertCircleIcon, CheckCircle2Icon, PopcornIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const NotConnected = () => {
  return (
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
  )
}

export default NotConnected