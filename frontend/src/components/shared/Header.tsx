import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

const Header = () => {
    return (
        <nav className= "navbar">
            <div className="flex flex-row items-center gap-4">
            <img src="/Logo.png" alt="ArtDrop Logo" className="h-10 w-10" />
            <div className = "bg-gradient-to-r from-purple-600 to-blue-500 text-white font-bold text-2xl pt-1 pb-1 pl-5 pr-5 rounded">ArtDrop</div>
            </div>
            <div className="flex items-center gap-10">   
                <Link className="text-white font-bold text-xl" href="/">Home</Link>
                <ConnectButton />
            </div>
        </nav>
    ); 
}

export default Header