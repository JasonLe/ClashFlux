import { useEffect, useState, useRef } from 'react';

interface TrafficData {
  up: number;
  down: number;
  time: number;
}

export function useTraffic() {
  const [data, setData] = useState<TrafficData[]>(() =>
    new Array(60).fill({ up: 0, down: 0, time: Date.now() })
  );
  const [currentSpeed, setCurrentSpeed] = useState({ up: 0, down: 0 });
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connect = async () => {
      const secret = await window.electronAPI.getClashSecret();
      const url = `ws://127.0.0.1:9097/traffic?token=${encodeURIComponent(secret)}`;
      
      ws.current = new WebSocket(url);

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setCurrentSpeed({ up: message.up, down: message.down });
          setData((prev) => {
            const newData = [...prev.slice(1), { 
              up: message.up, 
              down: message.down, 
              time: Date.now() 
            }];
            return newData;
          });
        } catch (e) {
          console.error("Failed to parse traffic message:", e);
        }
      };

      ws.current.onerror = () => {
        // Suppress noisy errors in console
        // console.error("Traffic WebSocket error:", err);
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return { data, currentSpeed };
}