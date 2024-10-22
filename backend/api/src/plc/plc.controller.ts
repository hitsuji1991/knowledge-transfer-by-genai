import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Patch,
  Body,
  Sse,
  Query,
} from "@nestjs/common";
import { PlcService } from "./plc.service";
import {
  Plc
} from "@industrial-knowledge-transfer-by-genai/common";

@Controller("plc/loops")
export class PlcController {
  constructor(private readonly plcService: PlcService) {}

  @Get("/:loopname")
  async getCharts(@Param("loopname") loopname: string, @Query('start') start?:string, @Query('end') end?: string):Promise<Plc[]> {
    console.log('[Debug]getCharts in plc.controller is called');
    return await this.plcService.getCharts(loopname, start, end);
  }
}
