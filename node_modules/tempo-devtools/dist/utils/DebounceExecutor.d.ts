export declare class DebounceExecutor {
    private animationFrameId;
    /**
     * Schedules a task to be executed using requestAnimationFrame.
     * If there's already a pending task, it will be replaced with the new one.
     * @param task The callback function to be executed
     * @param timeoutMs Optional timeout in milliseconds for warning (default: 16ms)
     */
    schedule(task: () => void): void;
}
