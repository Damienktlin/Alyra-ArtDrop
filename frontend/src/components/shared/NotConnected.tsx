import { AlertCircleIcon, CheckCircle2Icon, PopcornIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const NotConnected = () => {
  return (
    <div className="grid w-full max-w-xl items-start gap-4">
      
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>You are not connected </AlertTitle>
        <AlertDescription>
          <p>Please connect your wallet to the dAPP</p>
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default NotConnected