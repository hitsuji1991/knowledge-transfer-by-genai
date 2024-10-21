import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LOAD_MODE } from '@/features/alert/hooks/useChart';
import { ChartProps } from '@/types/alert';
import { Chart, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-moment';

function ChartPanel({
  data,
  loopName,
  onModeChange,
}: {
  data: ChartProps;
  loopName: string;
  onModeChange: (value: LOAD_MODE) => void;
}) {
  Chart.register(...registerables, zoomPlugin);

  const colors = [
    { color: 'rgb(100, 116, 139)', bgcolor: 'rgba(100, 116, 139, 0.1)' }, //slate-500 as fallback color
    { color: 'rgb(234, 179, 8)', bgcolor: 'rgba(234, 179, 8, 0.1)' }, //yellow-500
    { color: 'rgb(16, 185, 129)', bgcolor: 'rgba(16, 185, 129, 0.1)' }, //emerald-500
    { color: 'rgb(6, 182, 212)', bgcolor: 'rgba(6, 182, 212, 0.1)' }, //cyan-500
  ];

  // const measureLabels = data.loop_values[0].measure_values.map((measure) =>
  //   new Date(measure.timestamp).toLocaleTimeString()
  // );

  const dataSets = data.map((measure, index) => {
    return {
      label: measure.measure_name,
      data: measure.measure_values.map((measure_value) => {
        return {
          x: new Date(measure_value.timestamp),
          y: measure_value.measure_value,
        };
      }),
      borderColor: colors[index + 1]
        ? colors[index + 1].color
        : colors[0].color,
      backgroundColor: colors[index + 1]
        ? colors[index + 1].bgcolor
        : colors[0].bgcolor,
      pointBackgroundColor: colors[index + 1]
        ? colors[index + 1].color
        : colors[0].color,
      fill: true,
    };
  });

  const chartData = {
    //labels: measureLabels,
    datasets: dataSets,
  };

  const options = {
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'timeseries',
        ticks: {
          callback: function (value: string) {
            return new Date(value).toLocaleTimeString();
          },
        },
      },
    },
    plugins: {
      zoom: {
        zoom: {
          limits: {
            x: {
              min: 'original',
              max: 'original',
            },
          },
          drag: {
            enabled: true,
          },
          wheel: {
            enabled: true,
          },
          mode: 'x',
        },
      },
    },
  };

  const plugins = [
    {
      id: 'increase-legend-spacing',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      beforeInit(chart: any) {
        const originalFit = chart.legend.fit;
        chart.legend.fit = function fit() {
          originalFit.bind(chart.legend)();
          this.height += 24;
        };
      },
    },
  ];

  return (
    <div className="grid grid-cols-12 gap-2 p-3">
      <div className="order-first col-span-10 col-start-2 lg:order-none lg:col-span-8 lg:col-start-3">
        <h3 className="text-lg font-semibold">
          {loopName} 制御ループのトレンド
        </h3>
        <p className="text-sm text-secondary-foreground">
          {loopName} 制御ループ内の測定タグ (PV値) の直近の傾向を確認できます
        </p>
      </div>
      <div className="col-span-12 flex justify-end px-4 text-sm">
        <RadioGroup
          className="flex"
          defaultValue="live"
          onValueChange={onModeChange}>
          <div className="flex space-x-2">
            <RadioGroupItem value="alert-vicinity" id="alert-vicinity" />
            <label htmlFor="alert-vicinity">Alert Vicinity</label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="live" id="live" />
            <label htmlFor="live">Live</label>
          </div>
        </RadioGroup>
      </div>
      <div className="col-span-12 h-64 lg:h-80 xl:h-96">
        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
        {/* @ts-ignore */}
        <Line data={chartData} options={options} plugins={plugins} />
      </div>
    </div>
  );
}
export default ChartPanel;
