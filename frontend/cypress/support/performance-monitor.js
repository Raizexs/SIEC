/**
 * SCRUM-51: Utilidades de Monitoreo de Rendimiento
 *
 * Este módulo proporciona funcionalidades para monitorear y reportar
 * métricas de rendimiento durante las pruebas de estrés.
 */

export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      memorySnapshots: [],
      frameRates: [],
      errors: [],
      webglContextLosses: 0,
    };
    this.startTime = Date.now();
    this.setupMonitoring();
  }

  setupMonitoring() {
    // Monitor memory if available
    if (performance.memory) {
      setInterval(() => {
        this.metrics.memorySnapshots.push({
          timestamp: Date.now() - this.startTime,
          usedJSHeapSize: performance.memory.usedJSHeapSize / 1024 / 1024, // Convert to MB
          totalJSHeapSize: performance.memory.totalJSHeapSize / 1024 / 1024,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit / 1024 / 1024,
        });
      }, 1000);
    }

    // Monitor console errors
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(" ");
      this.metrics.errors.push({
        timestamp: Date.now() - this.startTime,
        message,
      });
      originalError.apply(console, args);
    };

    // Monitor WebGL context loss
    const setupWebGLMonitoring = () => {
      const canvases = document.querySelectorAll("canvas");
      canvases.forEach((canvas) => {
        canvas.addEventListener("webglcontextlost", () => {
          this.metrics.webglContextLosses++;
          console.error("⚠️ WebGL Context Lost!");
        });
      });
    };

    // Call once on setup and again when new canvases are added
    setupWebGLMonitoring();
    const observer = new MutationObserver(() => {
      setupWebGLMonitoring();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  getReport() {
    const report = {
      duration: Date.now() - this.startTime,
      memoryStats: this.getMemoryStats(),
      errorCount: this.metrics.errors.length,
      webglContextLosses: this.metrics.webglContextLosses,
      errors: this.metrics.errors,
      status: this.getStatus(),
    };
    return report;
  }

  getMemoryStats() {
    if (this.metrics.memorySnapshots.length === 0) {
      return null;
    }

    const snapshots = this.metrics.memorySnapshots;
    const heapSizes = snapshots.map((s) => s.usedJSHeapSize);
    const minHeap = Math.min(...heapSizes);
    const maxHeap = Math.max(...heapSizes);
    const avgHeap = heapSizes.reduce((a, b) => a + b) / heapSizes.length;

    return {
      minHeapSize: minHeap.toFixed(2) + " MB",
      maxHeapSize: maxHeap.toFixed(2) + " MB",
      avgHeapSize: avgHeap.toFixed(2) + " MB",
      potentialMemoryLeak: maxHeap - minHeap > 50, // Flag if > 50MB growth
    };
  }

  getStatus() {
    if (this.metrics.webglContextLosses > 0) {
      return "⚠️ FAILED: WebGL Context Lost detected";
    }
    if (this.metrics.errors.length > 10) {
      return "⚠️ WARNING: Multiple errors detected";
    }
    return "✅ PASSED: All metrics within acceptable range";
  }

  printReport() {
    const report = this.getReport();
    console.log("╔════════════════════════════════════════╗");
    console.log("║  Performance Monitor Report - SCRUM-51 ║");
    console.log("╚════════════════════════════════════════╝");
    console.log(`⏱️  Duration: ${report.duration}ms`);
    console.log(`📊 Errors: ${report.errorCount}`);
    console.log(`🔴 WebGL Context Losses: ${report.webglContextLosses}`);

    if (report.memoryStats) {
      console.log("\n💾 Memory Statistics:");
      console.log(`  Min: ${report.memoryStats.minHeapSize}`);
      console.log(`  Max: ${report.memoryStats.maxHeapSize}`);
      console.log(`  Avg: ${report.memoryStats.avgHeapSize}`);
      if (report.memoryStats.potentialMemoryLeak) {
        console.log(`  ⚠️  Potential memory leak detected!`);
      }
    }

    console.log(`\n📈 Status: ${report.status}`);

    if (report.errors.length > 0) {
      console.log("\n🚨 Errors:");
      report.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. [${err.timestamp}ms] ${err.message}`);
      });
    }
  }
}

// Export for use in tests
window.PerformanceMonitor = PerformanceMonitor;
