import { Component, ElementRef, ViewChild, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [CommonModule, FormsModule],
  standalone: true,
  selector: 'app-firma',
  styleUrl: './firma.css',
  templateUrl: './firma.html',
})
export class Firma implements AfterViewInit {
  @ViewChild('sigCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private port: SerialPort | null = null;

  remitoId = 'REM-2026-001';
  isConnected = signal(false);
  isEmpty = signal(true);
  statusMessage = signal('Desconectado');

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    // Ajustar resolución interna del canvas al tamaño visual para evitar trazos pixelados
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const context = canvas.getContext('2d');
    if (context) {
      this.ctx = context;
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 2.5;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }
  }

  onPointerDown(event: PointerEvent): void {
    this.isDrawing = true;
    this.isEmpty.set(false);
    const { x, y } = this.getCoordinates(event);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDrawing) return;
    const { x, y } = this.getCoordinates(event);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  onPointerUp(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.ctx.closePath();
  }

  clearCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.isEmpty.set(true);
  }

  private getCoordinates(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  // Conexión al puerto serie mediante Web Serial API
  async connectSerial(): Promise<void> {
    if (!('serial' in navigator)) {
      this.statusMessage.set('Error: Web Serial API no soportada en este navegador.');
      return;
    }

    try {
      // Abre el diálogo nativo de Android para elegir el dispositivo OTG
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });
      this.isConnected.set(true);
      this.statusMessage.set('Puerto USB OTG abierto (115200 baudios)');
    } catch (error) {
      this.isConnected.set(false);
      this.statusMessage.set(`Error al conectar: ${(error as Error).message}`);
    }
  }

  // Empaquetado y envío de ráfaga por USB Serial
  async sendSignature(): Promise<void> {
    if (!this.port || !this.port.writable) {
      this.statusMessage.set('El puerto USB no está listo para escritura.');
      return;
    }

    try {
      const canvas = this.canvasRef.nativeElement;
      // Exporta el trazo con fondo transparente en formato PNG Base64
      const base64Image = canvas.toDataURL('image/png');

      const packet = {
        tipo: 'firma_remito',
        id_remito: this.remitoId,
        timestamp: Math.floor(Date.now() / 1000),
        payload: base64Image
      };

      // Delimitador \n al final para lectura línea por línea en el receptor
      const serializedData = JSON.stringify(packet) + '\n';
      const encoder = new TextEncoder();
      const writer = this.port.writable.getWriter();

      await writer.write(encoder.encode(serializedData));
      writer.releaseLock();

      this.statusMessage.set(`Firma enviada para ${this.remitoId}`);
      this.clearCanvas();
    } catch (error) {
      this.statusMessage.set(`Error de transmisión: ${(error as Error).message}`);
    }
  }
}