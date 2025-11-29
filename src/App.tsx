import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "@/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Proxies from "@/pages/Proxies";
import Profiles from "@/pages/Profiles";
import Settings from "@/pages/Settings";
import Logs from "@/pages/Logs";
import Analytics from "@/pages/Analytics";
import Connections from "@/pages/Connections";
import { Toaster } from "sonner"; // 直接从库引入，不再使用 @/components/ui/sonner

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="proxies" element={<Proxies />} />
          <Route path="profiles" element={<Profiles />} />
          <Route path="connections" element={<Connections />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="logs" element={<Logs />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" richColors closeButton theme="system" />
    </HashRouter>
  );
}

export default App;