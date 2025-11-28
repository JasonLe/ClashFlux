import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Proxies from "@/pages/Proxies";
import Profiles from "@/pages/Profiles";
import Settings from "@/pages/Settings";
import Logs from "@/pages/Logs";
import Analytics from "@/pages/Analytics";
import Connections from "@/pages/Connections"; // === 引入连接页面 ===
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="proxies" element={<Proxies />} />
          <Route path="profiles" element={<Profiles />} />
          <Route path="connections" element={<Connections />} /> {/* === 替换为连接页面 === */}
          <Route path="analytics" element={<Analytics />} />
          <Route path="logs" element={<Logs />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" theme="system" />
    </BrowserRouter>
  );
}

export default App;