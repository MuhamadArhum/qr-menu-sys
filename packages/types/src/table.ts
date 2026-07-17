import type { Status } from "./common";

export type Table = {
  id: string;
  branchId: string;
  label: string;
  capacity: number | null;
  status: Status;
  qrCode: QRCode | null;
  createdAt: string;
  updatedAt: string;
};

export type QRCode = {
  id: string;
  tableId: string;
  codeValue: string;
  status: "active" | "invalidated";
  generatedAt: string;
};

export type QRCodeFormat = "png" | "svg" | "pdf";
