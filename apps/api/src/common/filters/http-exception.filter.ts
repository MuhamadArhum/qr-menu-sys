import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let fields: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj["message"] as string) ?? message;

        // class-validator field errors
        if (Array.isArray(resObj["message"])) {
          message = "Validation failed";
          fields = this.parseValidationErrors(resObj["message"] as string[]);
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      success: false,
      error: {
        code: this.statusToCode(status),
        message,
        ...(fields && { fields }),
      },
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private parseValidationErrors(messages: string[]): Record<string, string[]> {
    const fields: Record<string, string[]> = {};
    for (const msg of messages) {
      const [field, ...rest] = msg.split(" ");
      const key = field ?? "unknown";
      if (!fields[key]) fields[key] = [];
      fields[key].push(rest.join(" "));
    }
    return fields;
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "UNPROCESSABLE_ENTITY",
      429: "TOO_MANY_REQUESTS",
      500: "INTERNAL_SERVER_ERROR",
    };
    return map[status] ?? "UNKNOWN_ERROR";
  }
}
