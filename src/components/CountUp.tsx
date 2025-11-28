import { useEffect, useState } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  suffix?: string;
  className?: string;
}

export function CountUp({ end, duration = 1000, suffix = "", className }: CountUpProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // easeOutExpo 缓动函数
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setCount(Math.floor(ease * end));
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span className={className}>{count}{suffix}</span>;
}