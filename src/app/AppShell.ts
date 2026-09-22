import { Screen } from './Screen.js';

export class AppShell {
  private current: Screen | null = null;

  constructor(private readonly root: HTMLElement) {}

  show(screen: Screen): void {
    if (this.current) {
      this.current.unmount();
    }
    this.root.innerHTML = '';
    this.current = screen;
    screen.mount(this.root);
  }
}
