import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Health check — registered BEFORE the global prefix so it lives at /health
  app.getHttpAdapter().get("/health", (_req: unknown, res: { json: (body: unknown) => void }) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use(compression());
  app.setGlobalPrefix("api/v1");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env["ALLOWED_ORIGINS"]?.split(",") ?? "*",
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle("Abyte Menu API")
    .setDescription("QR Restaurant Menu & Ordering SaaS Platform")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env["PORT"] ?? 3001;
  await app.listen(port);

  console.log(`API running on http://localhost:${port}/api/v1`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
