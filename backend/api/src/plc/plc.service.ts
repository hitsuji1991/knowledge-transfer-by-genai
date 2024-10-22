import { TimestreamQuery } from '@aws-sdk/client-timestream-query';
import { QueryCommand } from '@aws-sdk/client-timestream-query';
import { Injectable } from "@nestjs/common";
import { Plc, getPlcs } from "@industrial-knowledge-transfer-by-genai/common";

const {
  REGION,
  TIMESTREAM_DATABASE_NAME,
  TIMESTREAM_TABLE_NAME
} = process.env;


@Injectable()
export class PlcService{
    async getCharts(loopName: string, start:string, end:string): Promise<Plc[]>{
        console.log('[Debug]getCharts in plc.service is called');
        const charts = await getPlcs(loopName, start, end);
        return charts
    }
}