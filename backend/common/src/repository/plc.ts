import { TimestreamQuery } from '@aws-sdk/client-timestream-query';
import { QueryCommand } from '@aws-sdk/client-timestream-query';
import { DateTime } from 'luxon';

import { Plc } from "../@types";

const timestreamQuery = new TimestreamQuery({ region: process.env.REGION });

const time_db = process.env.TIMESTREAM_DATABASE_NAME;
const time_table = process.env.TIMESTREAM_TABLE_NAME;

interface MeasureValue {
  timestamp: string;
  tag_name: string;
  measure_value: string;
}

interface Charts {
  measure_name: string;
  measure_values: MeasureValue[];
}

export const getPlcs = async (loopName: string, start: string, end: string): Promise<Charts[]> => {
    console.log('[Debug]getPlcs in plc.ts is called');

    const query = `
      SELECT time, measure_name, measure_value::varchar 
      FROM "${time_db}"."${time_table}" 
      WHERE measure_name = '${loopName}' 
      AND time BETWEEN '${start.replace('%20', ' ')}' AND '${end.replace('%20', ' ')}'
      ORDER BY time
    `;

    console.log('[Debug] query is ' + query);

    const params = {
      QueryString: query
    };

    console.log('[Debug]Start QueryCommand');
    const command = new QueryCommand(params);
    console.log('[Debug]Executing QueryCommand');

    const response = await timestreamQuery.send(command);
    console.log('[Debug]response is', response);
    console.table(response);
    console.log('[Debug]End QueryCommand');
    
    const dataDict: { [key: string]: MeasureValue[] } = {};

    response.Rows?.forEach(data => {
      const timestamp = data.Data?.[0]?.ScalarValue?.replace(/000$/, '') ?? '';
      const timestampObj = DateTime.fromFormat(timestamp, "yyyy-MM-dd HH:mm:ss.u");
      const formattedTimestamp = timestampObj.isValid ? timestampObj.toISO() + 'Z' : '';

      const loopName = data.Data?.[1]?.ScalarValue ?? '';

      const measureValuesString = data.Data?.[2]?.ScalarValue ?? '{}';
      const measureValues = JSON.parse(measureValuesString);

      Object.entries(measureValues).forEach(([measureName, measureValue]) => {
        const tmp: MeasureValue = {
          timestamp: formattedTimestamp,
          tag_name: `${loopName}_${measureName}_pv`,
          measure_value: String(measureValue),
        };

        if (measureName in dataDict) {
          dataDict[measureName].push(tmp);
        } else {
          dataDict[measureName] = [tmp];
        }
      });
    });

    const charts: Charts[] = Object.entries(dataDict).map(([key, value]) => ({
      measure_name: key,
      measure_values: value,
    }));

    return charts;
};