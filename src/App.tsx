import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

import AdminDashboard from "./pages/admin/Dashboard";
import DataZakat from "./pages/admin/DataZakat";
import DataMustahik from "./pages/admin/DataMustahik";
import AdminDistribusi from "./pages/admin/Distribusi";
import Laporan from "./pages/admin/Laporan";
import KelolaRT from "./pages/admin/KelolaRT";
import KelolaPanitia from "./pages/admin/KelolaPanitia";

import PanitiaDashboard from "./pages/panitia/Dashboard";
import InputZakat from "./pages/panitia/InputZakat";
import PanitiaMustahik from "./pages/panitia/DataMustahik";
import PanitiaDistribusi from "./pages/panitia/Distribusi";
import PanitiaLaporan from "./pages/panitia/Laporan";
import VerifikasiKwitansi from "./pages/VerifikasiKwitansi";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/verifikasi/:receiptNumber" element={<VerifikasiKwitansi />} />
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/zakat" element={<ProtectedRoute allowedRoles={['admin']}><DataZakat /></ProtectedRoute>} />
            <Route path="/admin/mustahik" element={<ProtectedRoute allowedRoles={['admin']}><DataMustahik /></ProtectedRoute>} />
            <Route path="/admin/distribusi" element={<ProtectedRoute allowedRoles={['admin']}><AdminDistribusi /></ProtectedRoute>} />
            <Route path="/admin/laporan" element={<ProtectedRoute allowedRoles={['admin']}><Laporan /></ProtectedRoute>} />
            <Route path="/admin/rt" element={<ProtectedRoute allowedRoles={['admin']}><KelolaRT /></ProtectedRoute>} />
            <Route path="/admin/panitia" element={<ProtectedRoute allowedRoles={['admin']}><KelolaPanitia /></ProtectedRoute>} />

            {/* Panitia Routes */}
            <Route path="/panitia/dashboard" element={<ProtectedRoute allowedRoles={['panitia']}><PanitiaDashboard /></ProtectedRoute>} />
            <Route path="/panitia/zakat" element={<ProtectedRoute allowedRoles={['panitia']}><InputZakat /></ProtectedRoute>} />
            <Route path="/panitia/mustahik" element={<ProtectedRoute allowedRoles={['panitia']}><PanitiaMustahik /></ProtectedRoute>} />
            <Route path="/panitia/distribusi" element={<ProtectedRoute allowedRoles={['panitia']}><PanitiaDistribusi /></ProtectedRoute>} />
            <Route path="/panitia/laporan" element={<ProtectedRoute allowedRoles={['panitia']}><PanitiaLaporan /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
