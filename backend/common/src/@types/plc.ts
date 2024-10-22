
export type MeasureValue = {
  timestamp: string;
  tag_name: string;
  measure_value: string;
}

export type Plc =  {
  measure_name: string;
  measure_values: MeasureValue[];
}