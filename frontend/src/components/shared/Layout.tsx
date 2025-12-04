import Header from "./Header";
import Footer from "./Footer";
import { Toaster } from "sonner";

const Layout = ({ children } : { children: React.ReactNode }) => {
    return (
        <div className="app">
            <Header />
            <main className="main">
                {children}
                <Toaster position="top-center" />
            </main>
            <Footer />
        </div>
    );
}

export default Layout