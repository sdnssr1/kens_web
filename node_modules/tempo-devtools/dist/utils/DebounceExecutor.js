"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebounceExecutor = void 0;
const TIME_PER_FRAME_MS = 16; // One frame at 60fps
class DebounceExecutor {
    constructor() {
        this.animationFrameId = null;
    }
    /**
     * Schedules a task to be executed using requestAnimationFrame.
     * If there's already a pending task, it will be replaced with the new one.
     * @param task The callback function to be executed
     * @param timeoutMs Optional timeout in milliseconds for warning (default: 16ms)
     */
    schedule(task) {
        // Cancel any existing animation frame
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.animationFrameId = requestAnimationFrame(() => {
            const startTime = performance.now();
            task();
            const duration = performance.now() - startTime;
            // if (duration > TIME_PER_FRAME_MS) {
            //   console.warn(`Took ${duration.toFixed(2)}ms to execute, which may affect app responsiveness`);
            // }
            this.animationFrameId = null;
        });
    }
}
exports.DebounceExecutor = DebounceExecutor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGVib3VuY2VFeGVjdXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9EZWJvdW5jZUV4ZWN1dG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLE1BQU0saUJBQWlCLEdBQUcsRUFBRSxDQUFDLENBQUMscUJBQXFCO0FBRW5ELE1BQWEsZ0JBQWdCO0lBQTdCO1FBQ1UscUJBQWdCLEdBQWtCLElBQUksQ0FBQztJQXdCakQsQ0FBQztJQXRCQzs7Ozs7T0FLRztJQUNILFFBQVEsQ0FBQyxJQUFnQjtRQUN2QixzQ0FBc0M7UUFDdEMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEtBQUssSUFBSSxFQUFFO1lBQ2xDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1NBQzdDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLHFCQUFxQixDQUFDLEdBQUcsRUFBRTtZQUNqRCxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDcEMsSUFBSSxFQUFFLENBQUM7WUFDUCxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDO1lBQy9DLHNDQUFzQztZQUN0QyxtR0FBbUc7WUFDbkcsSUFBSTtZQUNKLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7UUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF6QkQsNENBeUJDIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgVElNRV9QRVJfRlJBTUVfTVMgPSAxNjsgLy8gT25lIGZyYW1lIGF0IDYwZnBzXG5cbmV4cG9ydCBjbGFzcyBEZWJvdW5jZUV4ZWN1dG9yIHtcbiAgcHJpdmF0ZSBhbmltYXRpb25GcmFtZUlkOiBudW1iZXIgfCBudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogU2NoZWR1bGVzIGEgdGFzayB0byBiZSBleGVjdXRlZCB1c2luZyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUuXG4gICAqIElmIHRoZXJlJ3MgYWxyZWFkeSBhIHBlbmRpbmcgdGFzaywgaXQgd2lsbCBiZSByZXBsYWNlZCB3aXRoIHRoZSBuZXcgb25lLlxuICAgKiBAcGFyYW0gdGFzayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgZXhlY3V0ZWRcbiAgICogQHBhcmFtIHRpbWVvdXRNcyBPcHRpb25hbCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcyBmb3Igd2FybmluZyAoZGVmYXVsdDogMTZtcylcbiAgICovXG4gIHNjaGVkdWxlKHRhc2s6ICgpID0+IHZvaWQpOiB2b2lkIHtcbiAgICAvLyBDYW5jZWwgYW55IGV4aXN0aW5nIGFuaW1hdGlvbiBmcmFtZVxuICAgIGlmICh0aGlzLmFuaW1hdGlvbkZyYW1lSWQgIT09IG51bGwpIHtcbiAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0aW9uRnJhbWVJZCk7XG4gICAgfVxuXG4gICAgdGhpcy5hbmltYXRpb25GcmFtZUlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgdGFzaygpO1xuICAgICAgY29uc3QgZHVyYXRpb24gPSBwZXJmb3JtYW5jZS5ub3coKSAtIHN0YXJ0VGltZTtcbiAgICAgIC8vIGlmIChkdXJhdGlvbiA+IFRJTUVfUEVSX0ZSQU1FX01TKSB7XG4gICAgICAvLyAgIGNvbnNvbGUud2FybihgVG9vayAke2R1cmF0aW9uLnRvRml4ZWQoMil9bXMgdG8gZXhlY3V0ZSwgd2hpY2ggbWF5IGFmZmVjdCBhcHAgcmVzcG9uc2l2ZW5lc3NgKTtcbiAgICAgIC8vIH1cbiAgICAgIHRoaXMuYW5pbWF0aW9uRnJhbWVJZCA9IG51bGw7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==