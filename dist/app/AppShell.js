export class AppShell {
    constructor(root) {
        this.root = root;
        this.current = null;
    }
    show(screen) {
        if (this.current) {
            this.current.unmount();
        }
        this.root.innerHTML = '';
        this.current = screen;
        screen.mount(this.root);
    }
}
//# sourceMappingURL=AppShell.js.map