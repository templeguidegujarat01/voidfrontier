export interface Screen {
  /** Called once when the screen becomes active. Build/attach DOM under `root` here. */
  mount(root: HTMLElement): void;
  /** Called once when navigating away. Tear down timers/listeners/DOM here. */
  unmount(): void;
}
