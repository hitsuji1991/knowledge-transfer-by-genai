import { useEffect, useState } from 'react';
import useHttp from "@/hooks/useHttp";
import { ChartProps } from '@/types/alert';

type Props = {
  loopName: string;
  openedAt?: string;
};

export type LOAD_MODE = 'live' | 'alert-vicinity';

const TIME_RANGE = 10 * 60 * 1000; // 20 minutes

const useChart = ({ loopName, openedAt }: Props) => {
  const [mode, setMode] = useState<LOAD_MODE>('live');
  const [chart, setChart] = useState<ChartProps>();

  useEffect(() => {
    if (!loopName) return;

    if (mode === 'live') {
      // Show latest data and polling every 1 min
      const endTime = Date.now();
      const beginTime = endTime - TIME_RANGE;
      loadData(beginTime, endTime);
      const interval = setInterval(() => {
        const endTime = Date.now();
        const beginTime = endTime - TIME_RANGE;
        loadData(beginTime, endTime);
      }, 10 * 1000); // 1 min
      return () => {
        clearInterval(interval);
      };
    } else {
      // Show alert vicinity data once
      if (!openedAt) {
        setMode('live');
        return;
      }
      const beginTime = new Date(openedAt!).getTime() - TIME_RANGE / 2;
      const endTime = new Date(openedAt!).getTime() + TIME_RANGE / 2;
      loadData(beginTime, endTime);
    }
  }, [mode, loopName, openedAt]);

  const http = useHttp();
  console.log('[Debug] Start to load data');

  const loadData = async (beginTime: number, endTime: number) => {
    const response = await http.getOnce<ChartProps>(`plc/loops/${loopName}`, {
      start: encodeURI(parseDate(new Date(beginTime))),
      end: encodeURI(parseDate(new Date(endTime))),
    });
    console.log('[Debug] Finish to load data');
    console.log('[Debug] response is ', response);
    setChart(response.data);
  };
  
  return {
    chart,
    mode,
    setMode,
  };
};

// Need to pass the date with the format yyyy-mm-dd hh:mm:ss
// UTC time is used
const parseDate = (date: Date) => {
  return date.toISOString().split('.')[0].replace(/T/g, ' ');
};

export default useChart;
