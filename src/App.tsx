import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Jobs from "./pages/Jobs";
import Categories from "./pages/Categories";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import PaymentPending from "./pages/PaymentPending";
import Auth from "./pages/Auth";
import Orders from "./pages/Orders";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import CompleteRegistration from "./pages/CompleteRegistration";
import MyTasks from "./pages/MyTasks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment-pending" element={<PaymentPending />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/complete-registration" element={<CompleteRegistration />} />
          <Route path="/my-tasks/:purchaseId" element={<MyTasks />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
