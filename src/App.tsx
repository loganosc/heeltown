import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AllSpecials from "./pages/AllSpecials";
import AllActivities from "./pages/AllActivities";
import AllMerchants from "./pages/AllMerchants";
import UploadMerchantImages from "./pages/UploadMerchantImages";
import ManageMerchantImages from "./pages/ManageMerchantImages";
import AdminMerchantAttributes from "./pages/AdminMerchantAttributes";
import Map from "./pages/Map";
import Favorites from "./pages/Favorites";
import MerchantPortal from "./pages/MerchantPortal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/map" element={<Map />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/specials" element={<AllSpecials />} />
            <Route path="/activities" element={<AllActivities />} />
            <Route path="/merchants" element={<AllMerchants />} />
            <Route path="/upload-merchant-images" element={<UploadMerchantImages />} />
            <Route path="/manage-merchant-images" element={<ManageMerchantImages />} />
            <Route path="/admin/merchant-attributes" element={<AdminMerchantAttributes />} />
            <Route path="/merchant-portal" element={<MerchantPortal />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
