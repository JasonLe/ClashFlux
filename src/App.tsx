import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Proxies from "@/pages/Proxies";
import Profiles from "@/pages/Profiles";
import Settings from "@/pages/Settings";
import Logs from "@/pages/Logs";         // <--- 确保这行存在
import Analytics from "@/pages/Analytics"; // <--- 确保这行存在
import { Toaster } from "@/components/ui/sonner";
import Rules from "./pages/Rules";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="proxies" element={<Proxies />} />
          <Route path="profiles" element={<Profiles />} /> 
          <Route path="rules" element={<Rules />} />
          <Route path="settings" element={<Settings />} />
          <Route path="logs" element={<Logs />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;