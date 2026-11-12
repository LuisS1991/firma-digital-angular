import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Firma } from './firma/firma';
@Component({
  imports: [RouterOutlet, Firma],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('firma-electronica');
}
