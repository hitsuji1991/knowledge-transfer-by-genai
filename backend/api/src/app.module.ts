import { Module, MiddlewareConsumer } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AlertModule } from "./alert/alert.module";
import { ChatModule } from "./chat/chat.module";
import { LoggerMiddleware } from "./middleware";
import { PlcModule } from "./plc/plc.module"

@Module({
  imports: [AlertModule, ChatModule, PlcModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes("");
  }
}
